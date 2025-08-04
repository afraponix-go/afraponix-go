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
                    (system_id, bed_number, bed_type, bed_name, volume_liters, area_m2, length_meters, width_meters, height_meters, 
                     plant_capacity, vertical_count, plants_per_vertical, equivalent_m2, reservoir_volume, 
                     trough_length, trough_count, plant_spacing, reservoir_volume_liters) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [req.params.systemId, bed.bed_number, bed.bed_type, bed.bed_name, bed.volume_liters, 
                     bed.area_m2, bed.length_meters, bed.width_meters, bed.height_meters, bed.plant_capacity, 
                     bed.vertical_count, bed.plants_per_vertical, bed.equivalent_m2, bed.reservoir_volume,
                     bed.trough_length, bed.trough_count, bed.plant_spacing, bed.reservoir_volume_liters], 
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

// Update a single grow bed
router.put('/bed/:systemId/:bedNumber', async (req, res) => {
    const { systemId, bedNumber } = req.params;
    const bedConfig = req.body;
    const db = getDatabase();

    try {
        // Check if bed exists
        const existingBed = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM grow_beds WHERE system_id = ? AND bed_number = ?', 
                [systemId, bedNumber], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existingBed) {
            // Update existing bed
            await new Promise((resolve, reject) => {
                db.run(`UPDATE grow_beds SET 
                    bed_type = ?, bed_name = ?, volume_liters = ?, area_m2 = ?, 
                    length_meters = ?, width_meters = ?, height_meters = ?, 
                    plant_capacity = ?, vertical_count = ?, plants_per_vertical = ?, 
                    equivalent_m2 = ?, reservoir_volume = ?, trough_length = ?, 
                    trough_count = ?, plant_spacing = ?, reservoir_volume_liters = ?
                    WHERE system_id = ? AND bed_number = ?`,
                    [bedConfig.bed_type, bedConfig.bed_name, bedConfig.volume_liters, 
                     bedConfig.area_m2, bedConfig.length_meters, bedConfig.width_meters, 
                     bedConfig.height_meters, bedConfig.plant_capacity, bedConfig.vertical_count, 
                     bedConfig.plants_per_vertical, bedConfig.equivalent_m2, bedConfig.reservoir_volume,
                     bedConfig.trough_length, bedConfig.trough_count, bedConfig.plant_spacing, 
                     bedConfig.reservoir_volume_liters, systemId, bedNumber],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        } else {
            // Insert new bed
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO grow_beds 
                    (system_id, bed_number, bed_type, bed_name, volume_liters, area_m2, 
                     length_meters, width_meters, height_meters, plant_capacity, vertical_count, 
                     plants_per_vertical, equivalent_m2, reservoir_volume, trough_length, 
                     trough_count, plant_spacing, reservoir_volume_liters) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [systemId, bedConfig.bed_number, bedConfig.bed_type, bedConfig.bed_name, 
                     bedConfig.volume_liters, bedConfig.area_m2, bedConfig.length_meters, 
                     bedConfig.width_meters, bedConfig.height_meters, bedConfig.plant_capacity, 
                     bedConfig.vertical_count, bedConfig.plants_per_vertical, bedConfig.equivalent_m2, 
                     bedConfig.reservoir_volume, bedConfig.trough_length, bedConfig.trough_count, 
                     bedConfig.plant_spacing, bedConfig.reservoir_volume_liters], 
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }

        // Return the updated/created bed
        const updatedBed = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM grow_beds WHERE system_id = ? AND bed_number = ?', 
                [systemId, bedNumber], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        db.close();
        res.json(updatedBed);

    } catch (error) {
        db.close();
        console.error('Error updating grow bed:', error);
        res.status(500).json({ error: 'Failed to update grow bed' });
    }
});

// Delete a specific grow bed
router.delete('/:bedId', async (req, res) => {
    const db = getDatabase();

    try {
        const result = await new Promise((resolve, reject) => {
            db.run('DELETE FROM grow_beds WHERE id = ?', [req.params.bedId], function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        db.close();

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Grow bed not found' });
        }

        res.json({ message: 'Grow bed deleted successfully' });

    } catch (error) {
        db.close();
        console.error('Error deleting grow bed:', error);
        res.status(500).json({ error: 'Failed to delete grow bed' });
    }
});

module.exports = router;