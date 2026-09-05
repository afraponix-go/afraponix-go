const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { canAccessSystem, getFarmAccess, WRITE_LEVELS } = require('../utils/systemAccess');

router.use(authenticateToken);

const canWriteFarm = (acc) => !!acc && (acc.level === 'owner' || WRITE_LEVELS.has(acc.level));

// A photo belongs either to a bed batch (system_id + batch_id) or a nursery batch
// (seedling_batch_id + farm_id). Access is checked against whichever it is.
async function canAccessPhoto(photo, userId, write) {
    if (photo.system_id) return canAccessSystem(photo.system_id, userId, { write });
    if (photo.farm_id) {
        const acc = await getFarmAccess(photo.farm_id, userId, getDatabase());
        return write ? canWriteFarm(acc) : !!acc;
    }
    return false;
}

// Photos live under images/batch-photos/<systemId | seedling-<id>>/ (served
// statically) and are indexed in batch_photos.
const storage = multer.diskStorage({
    destination(req, file, cb) {
        const sub = req.params.systemId || `seedling-${req.params.seedlingId}`;
        const dir = path.join('./images/batch-photos', String(sub));
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

// Same, for a nursery (seedling) batch — checks the seedling's farm.
async function requireSeedlingWrite(req, res, next) {
    const pool = getDatabase();
    const [rows] = await pool.execute('SELECT id, farm_id, crop_name, batch_number FROM seedling_batches WHERE id = ?', [req.params.seedlingId]);
    if (!rows.length) return res.status(404).json({ error: 'Seedling batch not found' });
    if (!canWriteFarm(await getFarmAccess(rows[0].farm_id, req.user.userId, pool))) {
        return res.status(403).json({ error: 'Access denied' });
    }
    req.seedling = rows[0];
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

// ---- Nursery (seedling) photos: keyed by seedling id, farm-scoped ----
router.post('/seedling/:seedlingId', requireSeedlingWrite, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
        const sb = req.seedling;
        const url = `/images/batch-photos/seedling-${sb.id}/${req.file.filename}`;
        const pool = getDatabase();
        const [result] = await pool.execute(
            `INSERT INTO batch_photos (seedling_batch_id, farm_id, batch_id, file_path, crop_type, recorded_by, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [sb.id, sb.farm_id, sb.batch_number || `seedling-${sb.id}`, url, sb.crop_name || null, req.user.userId, req.body.notes || null]
        );
        const [rows] = await pool.execute('SELECT * FROM batch_photos WHERE id = ?', [result.insertId]);
        res.status(201).json({ photo: rowToPhoto(rows[0]) });
    } catch (error) {
        console.error('Failed to save seedling photo:', error);
        res.status(500).json({ error: 'Failed to save photo' });
    }
});

router.get('/seedling/:seedlingId', async (req, res) => {
    try {
        const pool = getDatabase();
        const [sb] = await pool.execute('SELECT farm_id FROM seedling_batches WHERE id = ?', [req.params.seedlingId]);
        if (!sb.length) return res.status(404).json({ error: 'Not found' });
        if (!(await getFarmAccess(sb[0].farm_id, req.user.userId, pool))) return res.status(403).json({ error: 'Access denied' });
        const [rows] = await pool.execute('SELECT * FROM batch_photos WHERE seedling_batch_id = ? ORDER BY taken_at DESC, id DESC', [req.params.seedlingId]);
        res.json({ photos: rows.map(rowToPhoto) });
    } catch (error) {
        console.error('Failed to load seedling photos:', error);
        res.status(500).json({ error: 'Failed to load photos' });
    }
});

// Gather the per-crop nutrient targets + latest water readings for a photo's
// system — the context that makes the analysis specific to this grower.
async function analysisContext(pool, photo) {
    let targets = null;
    let crop = { name: photo.crop_type, code: photo.crop_type };
    // Owner: from the system (bed photo) or the farm (nursery photo).
    let ownerId = null;
    if (photo.system_id) {
        const [sys] = await pool.execute('SELECT user_id FROM systems WHERE id = ?', [photo.system_id]);
        ownerId = sys.length ? sys[0].user_id : null;
    } else if (photo.farm_id) {
        const [f] = await pool.execute('SELECT owner_id FROM farms WHERE id = ?', [photo.farm_id]);
        ownerId = f.length ? f[0].owner_id : null;
    }
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
        if (!(await canAccessPhoto(photo, req.user.userId, true))) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Per-user weekly cap (rolling 7 days). Admins are exempt. Counted only on
        // success (below), so a provider error doesn't burn a user's quota.
        const LIMIT = Number(process.env.AI_WEEKLY_LIMIT) || 10;
        const capped = req.user.userRole !== 'admin';
        let used = 0;
        if (capped) {
            const [cnt] = await pool.execute(
                "SELECT COUNT(*) AS c FROM ai_usage WHERE user_id = ? AND kind = 'deficiency_analysis' AND created_at > (NOW() - INTERVAL 7 DAY)",
                [req.user.userId]
            );
            used = Number(cnt[0].c) || 0;
            if (used >= LIMIT) {
                return res.status(429).json({
                    error: `Weekly analysis limit reached — ${LIMIT} per week. It frees up as your earlier analyses pass 7 days old.`,
                    quota: { limit: LIMIT, used, remaining: 0 },
                });
            }
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
        // Count this successful call against the user's weekly quota.
        if (capped) {
            await pool.execute("INSERT INTO ai_usage (user_id, kind) VALUES (?, 'deficiency_analysis')", [req.user.userId]);
            used += 1;
        }
        const [updated] = await pool.execute('SELECT * FROM batch_photos WHERE id = ?', [photo.id]);
        res.json({ photo: rowToPhoto(updated[0]), quota: { limit: LIMIT, used, remaining: capped ? Math.max(0, LIMIT - used) : null } });
    } catch (error) {
        if (error.code === 'engine_unconfigured') {
            return res.status(503).json({ error: error.message });
        }
        // Surface AI-provider errors (billing, rate limit) so they're actionable
        // instead of a misleading "try again".
        if (typeof error.status === 'number') {
            const m = String(error.message || '');
            const friendly = /credit balance|billing|quota/i.test(m)
                ? 'The AI provider account is out of credits — add credits in the Anthropic Console (Plans & Billing).'
                : error.status === 429
                    ? 'The AI provider is rate-limiting requests — try again in a moment.'
                    : error.status === 401 || error.status === 403
                        ? 'The AI provider rejected the API key — check ANTHROPIC_API_KEY.'
                        : `Analysis engine error (${error.status}).`;
            console.error('Analyze provider error:', error.status, m);
            return res.status(502).json({ error: friendly });
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
        const [rows] = await pool.execute('SELECT system_id, farm_id FROM batch_photos WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        if (!(await canAccessPhoto(rows[0], req.user.userId, true))) {
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
        if (!(await canAccessPhoto(rows[0], req.user.userId, true))) {
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
