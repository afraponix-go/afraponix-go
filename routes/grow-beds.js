const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all grow beds for a system
router.get('/system/:systemId', async (req, res) => {
    const db = getDatabase();

    try {
        const growBeds = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM grow_beds WHERE system_id = ? ORDER BY bed_number', 
                [req.params.systemId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        db.close();
        res.json(growBeds);

    } catch (error) {
        db.close();
        console.error('Error fetching grow beds:', error);
        res.status(500).json({ error: 'Failed to fetch grow beds' });
    }
});

// Create or update grow beds for a system
router.post('/system/:systemId', async (req, res) => {
    const { growBeds } = req.body;
    const db = getDatabase();

    try {
        // Delete existing grow beds for this system
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM grow_beds WHERE system_id = ?', 
                [req.params.systemId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Insert new grow beds
        for (const bed of growBeds) {
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO grow_beds 
                    (system_id, bed_number, bed_type, volume_liters, area_m2, length_meters, plant_capacity, vertical_count, plants_per_vertical, equivalent_m2) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [req.params.systemId, bed.bed_number, bed.bed_type, bed.volume_liters, 
                     bed.area_m2, bed.length_meters, bed.plant_capacity, bed.vertical_count, bed.plants_per_vertical, bed.equivalent_m2], 
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }

        // Get the created grow beds
        const createdBeds = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM grow_beds WHERE system_id = ? ORDER BY bed_number', 
                [req.params.systemId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        db.close();
        res.json(createdBeds);

    } catch (error) {
        db.close();
        console.error('Error saving grow beds:', error);
        res.status(500).json({ error: 'Failed to save grow beds' });
    }
});

module.exports = router;