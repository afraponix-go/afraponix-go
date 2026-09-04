const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { canAccessSystem } = require('../utils/systemAccess');

router.use(authenticateToken);

// Photos live under images/batch-photos/<systemId>/ (served statically) and are
// indexed in batch_photos.
const storage = multer.diskStorage({
    destination(req, file, cb) {
        const dir = path.join('./images/batch-photos', String(req.params.systemId));
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename(_req, file, cb) {
        // batch_id can contain "/ · #", so don't derive the name from it — the
        // batch is recorded in the DB row, not the filename.
        const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
    fileFilter(_req, file, cb) {
        const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
        cb(ok.includes(file.mimetype) ? null : new Error('Only image files are allowed'), ok.includes(file.mimetype));
    },
});

// Check write access before multer writes the file to disk.
async function requireWrite(req, res, next) {
    if (!(await canAccessSystem(req.params.systemId, req.user.userId, { write: true }))) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }
    next();
}

const rowToPhoto = (r) => ({
    id: r.id,
    batch_id: r.batch_id,
    url: r.file_path,
    crop_type: r.crop_type,
    taken_at: r.taken_at,
    recorded_by: r.recorded_by,
    notes: r.notes,
    analysis: safeJson(r.analysis),
    analysis_engine: r.analysis_engine,
    analyzed_at: r.analyzed_at,
    label_status: r.label_status,
    label_nutrient: r.label_nutrient,
});
const safeJson = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

// Add a photo to a batch. batch_id comes in the multipart body (not the path):
// batch ids contain "/", which Apache blocks in a path segment.
router.post('/:systemId', requireWrite, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
        const { systemId } = req.params;
        const batchId = req.body.batch_id;
        if (!batchId) return res.status(400).json({ error: 'batch_id is required' });
        const url = `/images/batch-photos/${systemId}/${req.file.filename}`;
        const pool = getDatabase();
        const [result] = await pool.execute(
            `INSERT INTO batch_photos (system_id, batch_id, file_path, crop_type, recorded_by, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [systemId, batchId, url, req.body.crop_type || null, req.user.userId, req.body.notes || null]
        );
        const [rows] = await pool.execute('SELECT * FROM batch_photos WHERE id = ?', [result.insertId]);
        res.status(201).json({ photo: rowToPhoto(rows[0]) });
    } catch (error) {
        console.error('Failed to save batch photo:', error);
        res.status(500).json({ error: 'Failed to save photo' });
    }
});

// List a batch's photos, newest first. batch_id in the query (contains "/").
router.get('/:systemId', async (req, res) => {
    try {
        const batchId = req.query.batch;
        if (!batchId) return res.status(400).json({ error: 'batch query param is required' });
        if (!(await canAccessSystem(req.params.systemId, req.user.userId, { write: false }))) {
            return res.status(403).json({ error: 'Access denied to this system' });
        }
        const pool = getDatabase();
        const [rows] = await pool.execute(
            'SELECT * FROM batch_photos WHERE system_id = ? AND batch_id = ? ORDER BY taken_at DESC, id DESC',
            [req.params.systemId, batchId]
        );
        res.json({ photos: rows.map(rowToPhoto) });
    } catch (error) {
        console.error('Failed to load batch photos:', error);
        res.status(500).json({ error: 'Failed to load photos' });
    }
});

// Gather the per-crop nutrient targets + latest water readings for a photo's
// system — the context that makes the analysis specific to this grower.
async function analysisContext(pool, photo) {
    let targets = null;
    let crop = { name: photo.crop_type, code: photo.crop_type };
    const [sys] = await pool.execute('SELECT user_id FROM systems WHERE id = ?', [photo.system_id]);
    const ownerId = sys.length ? sys[0].user_id : null;
    if (ownerId && photo.crop_type) {
        const [cc] = await pool.execute(
            `SELECT crop_name, target_n, target_p, target_k, target_ca, target_mg, target_fe, target_ec
             FROM custom_crops WHERE user_id = ? AND (crop_code = ? OR crop_name = ?) LIMIT 1`,
            [ownerId, photo.crop_type, photo.crop_type]
        );
        if (cc.length) {
            crop = { name: cc[0].crop_name || photo.crop_type, code: photo.crop_type };
            targets = { n: cc[0].target_n, p: cc[0].target_p, k: cc[0].target_k, ca: cc[0].target_ca, mg: cc[0].target_mg, fe: cc[0].target_fe, ec: cc[0].target_ec };
        }
    }
    // Latest value per nutrient type for this system.
    const [nr] = await pool.execute(
        'SELECT nutrient_type, value, reading_date FROM nutrient_readings WHERE system_id = ? ORDER BY reading_date DESC, id DESC LIMIT 300',
        [photo.system_id]
    );
    const seen = new Set();
    const readings = [];
    for (const r of nr) {
        if (seen.has(r.nutrient_type)) continue;
        seen.add(r.nutrient_type);
        readings.push({ type: r.nutrient_type, value: r.value });
    }
    return { crop, targets, readings };
}

// Run deficiency analysis on a photo and store the result.
router.post('/:id/analyze', async (req, res) => {
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute('SELECT * FROM batch_photos WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        const photo = rows[0];
        if (!(await canAccessSystem(photo.system_id, req.user.userId, { write: true }))) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Read the image off disk.
        const filePath = path.join('.', photo.file_path);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Photo file missing' });
        const imageBase64 = fs.readFileSync(filePath).toString('base64');
        const ext = path.extname(filePath).toLowerCase();
        const mediaType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

        const ctx = await analysisContext(pool, photo);
        const { analyzeBatchPhoto } = require('../services/deficiencyEngine');
        const result = await analyzeBatchPhoto({ imageBase64, mediaType, ...ctx });

        await pool.execute(
            'UPDATE batch_photos SET analysis = ?, analysis_engine = ?, analyzed_at = NOW() WHERE id = ?',
            [JSON.stringify(result), result.engine + (result.model ? `:${result.model}` : ''), photo.id]
        );
        const [updated] = await pool.execute('SELECT * FROM batch_photos WHERE id = ?', [photo.id]);
        res.json({ photo: rowToPhoto(updated[0]) });
    } catch (error) {
        if (error.code === 'engine_unconfigured') {
            return res.status(503).json({ error: error.message });
        }
        console.error('Failed to analyze batch photo:', error);
        res.status(500).json({ error: 'Analysis failed — please try again.' });
    }
});

// Operator confirm/correct — the label that trains a future in-house engine.
router.post('/:id/label', async (req, res) => {
    try {
        const { status, nutrient } = req.body || {};
        if (!['confirmed', 'corrected', 'not_deficiency'].includes(status)) {
            return res.status(400).json({ error: 'status must be confirmed, corrected or not_deficiency' });
        }
        const pool = getDatabase();
        const [rows] = await pool.execute('SELECT system_id FROM batch_photos WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        if (!(await canAccessSystem(rows[0].system_id, req.user.userId, { write: true }))) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await pool.execute(
            'UPDATE batch_photos SET label_status = ?, label_nutrient = ?, labeled_by = ?, labeled_at = NOW() WHERE id = ?',
            [status, status === 'corrected' ? (nutrient || null) : null, req.user.userId, req.params.id]
        );
        const [updated] = await pool.execute('SELECT * FROM batch_photos WHERE id = ?', [req.params.id]);
        res.json({ photo: rowToPhoto(updated[0]) });
    } catch (error) {
        console.error('Failed to label batch photo:', error);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
});

// Delete a photo (and its file).
router.delete('/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute('SELECT * FROM batch_photos WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        if (!(await canAccessSystem(rows[0].system_id, req.user.userId, { write: true }))) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await pool.execute('DELETE FROM batch_photos WHERE id = ?', [req.params.id]);
        // Best-effort file cleanup (leading slash → repo-relative path).
        fs.unlink(path.join('.', rows[0].file_path), () => {});
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete batch photo:', error);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});

module.exports = router;
