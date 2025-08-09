const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get plant allocations for a system
router.get('/allocations/:systemId', async (req, res) => {
    let connection;

    try {
        connection = await getDatabase();
        
        const [allocations] = await connection.execute(`
            SELECT pa.*, gb.bed_name, gb.bed_type, gb.equivalent_m2
            FROM plant_allocations pa
            LEFT JOIN grow_beds gb ON pa.grow_bed_id = gb.id
            WHERE pa.system_id = ?
            ORDER BY gb.bed_number, pa.crop_type
        `, [req.params.systemId]);

        res.json(allocations);

    } catch (error) {
        console.error('Error fetching plant allocations:', error);
        res.status(500).json({ error: 'Failed to fetch plant allocations' });
    } finally {
        if (connection) {
            await connection.end();
        }
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
        datePlanted,
        plantSpacing 
    } = req.body;

    if (!systemId || !growBedId || !cropType || !percentageAllocated) {
        return res.status(400).json({ 
            error: 'System ID, grow bed ID, crop type, and percentage are required' 
        });
    }

    let connection;

    try {
        connection = await getDatabase();
        
        // Check if allocation already exists
        const [existingRows] = await connection.execute(
            'SELECT id FROM plant_allocations WHERE system_id = ? AND grow_bed_id = ? AND crop_type = ?',
            [systemId, growBedId, cropType]
        );

        if (existingRows.length > 0) {
            // Update existing allocation
            await connection.execute(`
                UPDATE plant_allocations 
                SET percentage_allocated = ?, plants_planted = ?, date_planted = ?, plant_spacing = ?
                WHERE id = ?
            `, [percentageAllocated, plantsPlanted || 0, datePlanted || null, plantSpacing || 30, existingRows[0].id]);
        } else {
            // Create new allocation
            await connection.execute(`
                INSERT INTO plant_allocations 
                (system_id, grow_bed_id, crop_type, percentage_allocated, plants_planted, date_planted, plant_spacing)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [systemId, growBedId, cropType, percentageAllocated, plantsPlanted || 0, datePlanted || null, plantSpacing || 30]);
        }

        res.json({ success: true, message: 'Plant allocation saved successfully' });

    } catch (error) {
        console.error('Error saving plant allocation:', error);
        res.status(500).json({ error: 'Failed to save plant allocation' });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// Get custom crops for user
router.get('/custom-crops', async (req, res) => {
    let connection;

    try {
        connection = await getDatabase();
        
        const [crops] = await connection.execute(
            'SELECT * FROM custom_crops WHERE user_id = ? ORDER BY crop_name',
            [req.user.userId]
        );

        res.json(crops);

    } catch (error) {
        console.error('Error fetching custom crops:', error);
        res.status(500).json({ error: 'Failed to fetch custom crops' });
    } finally {
        if (connection) {
            await connection.end();
        }
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

    let connection;

    try {
        connection = await getDatabase();
        
        const [result] = await connection.execute(`
            INSERT INTO custom_crops 
            (user_id, crop_name, target_n, target_p, target_k, target_ca, target_mg, target_fe, target_ec)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.user.userId, cropName, targetN, targetP, targetK, targetCa, targetMg, targetFe, targetEc]);

        res.json({ success: true, id: result.insertId, message: 'Custom crop added successfully' });

    } catch (error) {
        console.error('Error adding custom crop:', error);
        res.status(500).json({ error: 'Failed to add custom crop' });
    } finally {
        if (connection) {
            await connection.end();
        }
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

    let connection;

    try {
        connection = await getDatabase();
        
        // Update the allocation
        await connection.execute(`
            UPDATE plant_allocations 
            SET crop_type = ?, percentage_allocated = ?, plants_planted = ?
            WHERE id = ?
        `, [cropType, percentageAllocated, plantsPlanted || 0, allocationId]);

        res.json({ success: true, message: 'Plant allocation updated successfully' });

    } catch (error) {
        console.error('Error updating plant allocation:', error);
        res.status(500).json({ error: 'Failed to update plant allocation' });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// Delete plant allocation
router.delete('/allocations/:id', async (req, res) => {
    let connection;

    try {
        connection = await getDatabase();
        
        await connection.execute(
            'DELETE FROM plant_allocations WHERE id = ?',
            [req.params.id]
        );

        res.json({ success: true, message: 'Plant allocation removed successfully' });

    } catch (error) {
        console.error('Error deleting plant allocation:', error);
        res.status(500).json({ error: 'Failed to delete plant allocation' });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// Delete custom crop
router.delete('/custom-crops/:id', async (req, res) => {
    let connection;

    try {
        connection = await getDatabase();
        
        await connection.execute(
            'DELETE FROM custom_crops WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );

        res.json({ success: true, message: 'Custom crop deleted successfully' });

    } catch (error) {
        console.error('Error deleting custom crop:', error);
        res.status(500).json({ error: 'Failed to delete custom crop' });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// Get grow bed utilization summary
router.get('/utilization/:systemId', async (req, res) => {
    let connection;

    try {
        connection = await getDatabase();
        
        const [utilization] = await connection.execute(`
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
        `, [req.params.systemId]);

        res.json(utilization);

    } catch (error) {
        console.error('Error fetching utilization data:', error);
        res.status(500).json({ error: 'Failed to fetch utilization data' });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

module.exports = router;