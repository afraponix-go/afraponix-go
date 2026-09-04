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
});

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
