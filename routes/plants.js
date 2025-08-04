const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get plant allocations for a system
router.get('/allocations/:systemId', async (req, res) => {
    const db = getDatabase();

    try {
        const allocations = await new Promise((resolve, reject) => {
            db.all(`
                SELECT pa.*, gb.bed_name, gb.bed_type, gb.equivalent_m2
                FROM plant_allocations pa
                LEFT JOIN grow_beds gb ON pa.grow_bed_id = gb.id
                WHERE pa.system_id = ?
                ORDER BY gb.bed_number, pa.crop_type
            `, [req.params.systemId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        db.close();
        res.json(allocations);

    } catch (error) {
        db.close();
        console.error('Error fetching plant allocations:', error);
        res.status(500).json({ error: 'Failed to fetch plant allocations' });
    }
});

// Add or update plant allocation
router.post('/allocations', async (req, res) => {
    const { 
        systemId, 
        growBedId, 
        cropType, 
        percentageAllocated, 
        plantsPlanted,
        datePlanted 
    } = req.body;

    if (!systemId || !growBedId || !cropType || !percentageAllocated) {
        return res.status(400).json({ 
            error: 'System ID, grow bed ID, crop type, and percentage are required' 
        });
    }

    const db = getDatabase();

    try {
        // Check if allocation already exists
        const existingAllocation = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id FROM plant_allocations WHERE system_id = ? AND grow_bed_id = ? AND crop_type = ?',
                [systemId, growBedId, cropType],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (existingAllocation) {
            // Update existing allocation
            await new Promise((resolve, reject) => {
                db.run(`
                    UPDATE plant_allocations 
                    SET percentage_allocated = ?, plants_planted = ?, date_planted = ?
                    WHERE id = ?
                `, [percentageAllocated, plantsPlanted, datePlanted, existingAllocation.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } else {
            // Create new allocation
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO plant_allocations 
                    (system_id, grow_bed_id, crop_type, percentage_allocated, plants_planted, date_planted)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [systemId, growBedId, cropType, percentageAllocated, plantsPlanted, datePlanted], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        db.close();
        res.json({ success: true, message: 'Plant allocation saved successfully' });

    } catch (error) {
        db.close();
        console.error('Error saving plant allocation:', error);
        res.status(500).json({ error: 'Failed to save plant allocation' });
    }
});

// Get custom crops for user
router.get('/custom-crops', async (req, res) => {
    const db = getDatabase();

    try {
        const crops = await new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM custom_crops WHERE user_id = ? ORDER BY crop_name',
                [req.user.userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        db.close();
        res.json(crops);

    } catch (error) {
        db.close();
        console.error('Error fetching custom crops:', error);
        res.status(500).json({ error: 'Failed to fetch custom crops' });
    }
});

// Add custom crop
router.post('/custom-crops', async (req, res) => {
    const { 
        cropName, 
        targetN, 
        targetP, 
        targetK, 
        targetCa, 
        targetMg, 
        targetFe, 
        targetEc 
    } = req.body;

    if (!cropName) {
        return res.status(400).json({ error: 'Crop name is required' });
    }

    const db = getDatabase();

    try {
        const result = await new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO custom_crops 
                (user_id, crop_name, target_n, target_p, target_k, target_ca, target_mg, target_fe, target_ec)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [req.user.userId, cropName, targetN, targetP, targetK, targetCa, targetMg, targetFe, targetEc], 
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });

        db.close();
        res.json({ success: true, id: result.id, message: 'Custom crop added successfully' });

    } catch (error) {
        db.close();
        console.error('Error adding custom crop:', error);
        res.status(500).json({ error: 'Failed to add custom crop' });
    }
});

// Update plant allocation
router.put('/allocations/:id', async (req, res) => {
    const { cropType, percentageAllocated, plantsPlanted } = req.body;
    const allocationId = req.params.id;

    if (!cropType || percentageAllocated === undefined) {
        return res.status(400).json({ 
            error: 'Crop type and percentage are required' 
        });
    }

    const db = getDatabase();

    try {
        // Update the allocation
        await new Promise((resolve, reject) => {
            db.run(`
                UPDATE plant_allocations 
                SET crop_type = ?, percentage_allocated = ?, plants_planted = ?
                WHERE id = ?
            `, [cropType, percentageAllocated, plantsPlanted || 0, allocationId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        db.close();
        res.json({ success: true, message: 'Plant allocation updated successfully' });

    } catch (error) {
        db.close();
        console.error('Error updating plant allocation:', error);
        res.status(500).json({ error: 'Failed to update plant allocation' });
    }
});

// Delete plant allocation
router.delete('/allocations/:id', async (req, res) => {
    const db = getDatabase();

    try {
        await new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM plant_allocations WHERE id = ?',
                [req.params.id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        db.close();
        res.json({ success: true, message: 'Plant allocation removed successfully' });

    } catch (error) {
        db.close();
        console.error('Error deleting plant allocation:', error);
        res.status(500).json({ error: 'Failed to delete plant allocation' });
    }
});

// Delete custom crop
router.delete('/custom-crops/:id', async (req, res) => {
    const db = getDatabase();

    try {
        await new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM custom_crops WHERE id = ? AND user_id = ?',
                [req.params.id, req.user.userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        db.close();
        res.json({ success: true, message: 'Custom crop deleted successfully' });

    } catch (error) {
        db.close();
        console.error('Error deleting custom crop:', error);
        res.status(500).json({ error: 'Failed to delete custom crop' });
    }
});

// Get grow bed utilization summary
router.get('/utilization/:systemId', async (req, res) => {
    const db = getDatabase();

    try {
        const utilization = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    gb.id,
                    gb.bed_name,
                    gb.bed_type,
                    gb.equivalent_m2,
                    COALESCE(SUM(pa.percentage_allocated), 0) as total_allocated,
                    (100 - COALESCE(SUM(pa.percentage_allocated), 0)) as available_percentage
                FROM grow_beds gb
                LEFT JOIN plant_allocations pa ON gb.id = pa.grow_bed_id AND pa.status = 'active'
                WHERE gb.system_id = ?
                GROUP BY gb.id, gb.bed_name, gb.bed_type, gb.equivalent_m2
                ORDER BY gb.bed_number
            `, [req.params.systemId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        db.close();
        res.json(utilization);

    } catch (error) {
        db.close();
        console.error('Error fetching utilization data:', error);
        res.status(500).json({ error: 'Failed to fetch utilization data' });
    }
});

module.exports = router;