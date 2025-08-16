const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get seed varieties for a specific crop type
router.get('/crop/:cropType', async (req, res) => {
    const { cropType } = req.params;
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        const [varieties] = await pool.execute(
            'SELECT * FROM seed_varieties WHERE crop_type = ? ORDER BY variety_name ASC',
            [cropType]
        );        res.json({ varieties });

    } catch (error) {
        console.error('Error fetching seed varieties:', error);
        res.status(500).json({ error: 'Failed to fetch seed varieties' });
    }
});

// Get all seed varieties grouped by crop type
router.get('/', async (req, res) => {
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        const [varieties] = await pool.execute(
            'SELECT * FROM seed_varieties ORDER BY crop_type ASC, variety_name ASC'
        );

        // Group by crop type
        const grouped = varieties.reduce((acc, variety) => {
            if (!acc[variety.crop_type]) {
                acc[variety.crop_type] = [];
            }
            acc[variety.crop_type].push(variety);
            return acc;
        }, {});        res.json({ varieties: grouped });

    } catch (error) {
        console.error('Error fetching all seed varieties:', error);
        res.status(500).json({ error: 'Failed to fetch seed varieties' });
    }
});

// Add a new seed variety
router.post('/', async (req, res) => {
    const { crop_type, variety_name } = req.body;
    
    if (!crop_type || !variety_name) {
        return res.status(400).json({ error: 'Crop type and variety name are required' });
    }

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        const [result] = await pool.execute(
            'INSERT INTO seed_varieties (crop_type, variety_name) VALUES (?, ?)',
            [crop_type, variety_name]
        );        res.status(201).json({ 
            message: 'Seed variety added successfully',
            id: result.insertId,
            crop_type,
            variety_name
        });

    } catch (error) {
        if (connection)        
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ 
                error: `Variety '${variety_name}' already exists for ${crop_type}` 
            });
        } else {
            console.error('Error adding seed variety:', error);
            res.status(500).json({ error: 'Failed to add seed variety' });
        }
    }
});

// Delete a seed variety
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        const [result] = await pool.execute(
            'DELETE FROM seed_varieties WHERE id = ?',
            [id]
        );        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Seed variety not found' });
        }

        res.json({ message: 'Seed variety deleted successfully' });

    } catch (error) {
        console.error('Error deleting seed variety:', error);
        res.status(500).json({ error: 'Failed to delete seed variety' });
    }
});

module.exports = router;