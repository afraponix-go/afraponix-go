const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

const VALID = ['view', 'collaborator', 'admin'];

// Confirm the caller owns the farm (only owners manage sharing).
async function ownsFarm(pool, farmId, userId) {
    const [rows] = await pool.execute('SELECT id FROM farms WHERE id = ? AND owner_id = ?', [farmId, userId]);
    return rows.length > 0;
}

// List the collaborators a farm is shared with.
router.get('/users', async (req, res) => {
    const { farm_id } = req.query;
    if (!farm_id) return res.status(400).json({ error: 'Farm ID is required' });
    try {
        const pool = getDatabase();
        if (!(await ownsFarm(pool, farm_id, req.user.userId))) {
            return res.status(403).json({ error: 'Not authorized to view this farm' });
        }
        const [shares] = await pool.execute(
            `SELECT fs.id, fs.permission_level, fs.status, fs.created_at,
                    u.username, u.email, u.first_name, u.last_name
             FROM farm_shares fs
             JOIN users u ON fs.shared_with_id = u.id
             WHERE fs.farm_id = ? AND fs.status = 'accepted'
             ORDER BY fs.created_at DESC`,
            [farm_id]
        );
        res.json({ shares: shares || [] });
    } catch (error) {
        console.error('Farm sharing error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Share a farm with a user by email. Granted immediately (no accept step), like
// system sharing — the recipient must already have an account.
router.post('/invite', async (req, res) => {
    const { farm_id, email, permission_level } = req.body;
    if (!farm_id || !email || !permission_level) {
        return res.status(400).json({ error: 'Farm ID, email, and permission level are required' });
    }
    if (!VALID.includes(permission_level)) {
        return res.status(400).json({ error: 'Invalid permission level' });
    }
    try {
        const pool = getDatabase();
        if (!(await ownsFarm(pool, farm_id, req.user.userId))) {
            return res.status(403).json({ error: 'Not authorized to share this farm' });
        }
        const [userRows] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        const user = userRows[0];
        if (!user) return res.status(404).json({ error: 'No account found with that email address' });
        if (user.id === req.user.userId) return res.status(400).json({ error: 'Cannot share a farm with yourself' });

        const [existing] = await pool.execute(
            'SELECT id FROM farm_shares WHERE farm_id = ? AND shared_with_id = ?',
            [farm_id, user.id]
        );
        if (existing.length) return res.status(400).json({ error: 'This farm is already shared with that user' });

        const [result] = await pool.execute(
            `INSERT INTO farm_shares (farm_id, owner_id, shared_with_id, permission_level, status)
             VALUES (?, ?, ?, ?, 'accepted')`,
            [farm_id, req.user.userId, user.id, permission_level]
        );
        res.json({ success: true, message: 'Farm shared successfully', share_id: result.insertId });
    } catch (error) {
        console.error('Farm sharing error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Change a collaborator's permission level (owner only).
router.put('/permission', async (req, res) => {
    const { share_id, permission_level } = req.body;
    if (!share_id || !permission_level) {
        return res.status(400).json({ error: 'Share ID and permission level are required' });
    }
    if (!VALID.includes(permission_level)) {
        return res.status(400).json({ error: 'Invalid permission level' });
    }
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute(
            `SELECT fs.id, f.owner_id FROM farm_shares fs JOIN farms f ON fs.farm_id = f.id WHERE fs.id = ?`,
            [share_id]
        );
        if (!rows.length || rows[0].owner_id !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized to modify this share' });
        }
        await pool.execute('UPDATE farm_shares SET permission_level = ? WHERE id = ?', [permission_level, share_id]);
        res.json({ success: true, message: 'Permission updated' });
    } catch (error) {
        console.error('Farm sharing error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Remove a collaborator (owner only).
router.delete('/access/:share_id', async (req, res) => {
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute(
            `SELECT fs.id, f.owner_id FROM farm_shares fs JOIN farms f ON fs.farm_id = f.id WHERE fs.id = ?`,
            [req.params.share_id]
        );
        if (!rows.length || rows[0].owner_id !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized to remove this access' });
        }
        await pool.execute('DELETE FROM farm_shares WHERE id = ?', [req.params.share_id]);
        res.json({ success: true, message: 'Access removed' });
    } catch (error) {
        console.error('Farm sharing error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
