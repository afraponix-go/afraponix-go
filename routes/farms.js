const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { generateFarmId } = require('../utils/farms');

router.use(authenticateToken);

// List the user's farms with a system count.
router.get('/', async (req, res) => {
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute(
            `SELECT f.id, f.name, f.location, f.created_at,
                    (SELECT COUNT(*) FROM systems s WHERE s.farm_id = f.id) AS system_count
             FROM farms f
             WHERE f.owner_id = ?
             ORDER BY f.created_at ASC, f.id ASC`,
            [req.user.userId]
        );
        res.json({ farms: rows });
    } catch (error) {
        console.error('Failed to list farms:', error);
        res.status(500).json({ error: 'Failed to load farms' });
    }
});

// Create a farm.
router.post('/', async (req, res) => {
    try {
        const name = String((req.body && req.body.name) || '').trim().slice(0, 255);
        if (!name) return res.status(400).json({ error: 'name is required' });
        const location = req.body && req.body.location ? String(req.body.location).trim().slice(0, 255) : null;
        const pool = getDatabase();
        const id = generateFarmId();
        await pool.execute('INSERT INTO farms (id, owner_id, name, location) VALUES (?, ?, ?, ?)', [id, req.user.userId, name, location]);
        const [rows] = await pool.execute('SELECT id, name, location, created_at FROM farms WHERE id = ?', [id]);
        res.status(201).json({ farm: rows[0] });
    } catch (error) {
        console.error('Failed to create farm:', error);
        res.status(500).json({ error: 'Failed to create farm' });
    }
});

// Rename / relocate (owner only).
router.put('/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const [own] = await pool.execute('SELECT id FROM farms WHERE id = ? AND owner_id = ?', [req.params.id, req.user.userId]);
        if (!own.length) return res.status(404).json({ error: 'Farm not found or access denied' });
        const b = req.body || {};
        const sets = [], vals = [];
        if (b.name !== undefined) {
            const name = String(b.name).trim().slice(0, 255);
            if (!name) return res.status(400).json({ error: 'name cannot be empty' });
            sets.push('name = ?'); vals.push(name);
        }
        if (b.location !== undefined) {
            sets.push('location = ?'); vals.push(b.location ? String(b.location).trim().slice(0, 255) : null);
        }
        if (sets.length) { vals.push(req.params.id); await pool.execute(`UPDATE farms SET ${sets.join(', ')} WHERE id = ?`, vals); }
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update farm:', error);
        res.status(500).json({ error: 'Failed to update farm' });
    }
});

// Delete (owner only) — refuses while systems still belong to it.
router.delete('/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const [own] = await pool.execute('SELECT id FROM farms WHERE id = ? AND owner_id = ?', [req.params.id, req.user.userId]);
        if (!own.length) return res.status(404).json({ error: 'Farm not found or access denied' });
        const [sys] = await pool.execute('SELECT COUNT(*) AS c FROM systems WHERE farm_id = ?', [req.params.id]);
        if (sys[0].c > 0) return res.status(400).json({ error: "Move or remove this farm's systems first" });
        await pool.execute('DELETE FROM farms WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete farm:', error);
        res.status(500).json({ error: 'Failed to delete farm' });
    }
});

module.exports = router;
