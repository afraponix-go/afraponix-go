const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get the current user's seed varieties for a specific crop type
router.get('/crop/:cropType', async (req, res) => {
    const { cropType } = req.params;
    try {
        const pool = getDatabase();
        const [varieties] = await pool.execute(
            'SELECT * FROM seed_varieties WHERE user_id = ? AND crop_type = ? ORDER BY variety_name ASC',
            [req.user.userId, cropType]
        );
        res.json({ varieties });
    } catch (error) {
        console.error('Error fetching seed varieties:', error);
        res.status(500).json({ error: 'Failed to fetch seed varieties' });
    }
});

// Get all of the current user's seed varieties grouped by crop type
router.get('/', async (req, res) => {
    try {
        const pool = getDatabase();
        const [varieties] = await pool.execute(
            'SELECT * FROM seed_varieties WHERE user_id = ? ORDER BY crop_type ASC, variety_name ASC',
            [req.user.userId]
        );

        const grouped = varieties.reduce((acc, variety) => {
            if (!acc[variety.crop_type]) acc[variety.crop_type] = [];
            acc[variety.crop_type].push(variety);
            return acc;
        }, {});
        res.json({ varieties: grouped });
    } catch (error) {
        console.error('Error fetching all seed varieties:', error);
        res.status(500).json({ error: 'Failed to fetch seed varieties' });
    }
});

// Add a new seed variety for the current user
router.post('/', async (req, res) => {
    const { crop_type, variety_name } = req.body;

    if (!crop_type || !variety_name) {
        return res.status(400).json({ error: 'Crop type and variety name are required' });
    }

    try {
        const pool = getDatabase();
        const [result] = await pool.execute(
            'INSERT INTO seed_varieties (user_id, crop_type, variety_name) VALUES (?, ?, ?)',
            [req.user.userId, crop_type, variety_name]
        );
        res.status(201).json({ message: 'Seed variety added successfully', id: result.insertId, crop_type, variety_name });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ error: `Variety '${variety_name}' already exists for ${crop_type}` });
        } else {
            console.error('Error adding seed variety:', error);
            res.status(500).json({ error: 'Failed to add seed variety' });
        }
    }
});

// Delete one of the current user's seed varieties
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = getDatabase();
        const [result] = await pool.execute(
            'DELETE FROM seed_varieties WHERE id = ? AND user_id = ?',
            [id, req.user.userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Seed variety not found or access denied' });
        }
        res.json({ message: 'Seed variety deleted successfully' });
    } catch (error) {
        console.error('Error deleting seed variety:', error);
        res.status(500).json({ error: 'Failed to delete seed variety' });
    }
});

module.exports = router;
