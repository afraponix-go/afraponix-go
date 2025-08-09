const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Save fish feeding schedule
router.post('/feeding-schedule', async (req, res) => {
    const { systemId, fishType, feedingsPerDay, feedingTimes } = req.body;

    if (!systemId || !fishType || !feedingsPerDay) {
        return res.status(400).json({ 
            error: 'System ID, fish type, and feedings per day are required' 
        });
    }

    let connection;

    try {
        connection = await getDatabase();
        
        // Check if feeding schedule already exists for this system
        const [existingRows] = await connection.execute(
            'SELECT id FROM fish_feeding WHERE system_id = ?',
            [systemId]
        );
        const existingSchedule = existingRows[0];

        if (existingSchedule) {
            // Update existing schedule
            await connection.execute(`
                UPDATE fish_feeding 
                SET fish_type = ?, feedings_per_day = ?, feeding_times = ?
                WHERE system_id = ?
            `, [fishType, feedingsPerDay, feedingTimes, systemId]);
        } else {
            // Create new schedule
            await connection.execute(`
                INSERT INTO fish_feeding 
                (system_id, fish_type, feedings_per_day, feeding_times)
                VALUES (?, ?, ?, ?)
            `, [systemId, fishType, feedingsPerDay, feedingTimes]);
        }

        await connection.end();
        res.json({ success: true, message: 'Feeding schedule saved successfully' });

    } catch (error) {
        if (connection) await connection.end();
        console.error('Error saving feeding schedule:', error);
        res.status(500).json({ error: 'Failed to save feeding schedule' });
    }
});

// Get fish feeding schedule for a system
router.get('/feeding-schedule/:systemId', async (req, res) => {
    let connection;

    try {
        connection = await getDatabase();
        
        const [scheduleRows] = await connection.execute(
            'SELECT * FROM fish_feeding WHERE system_id = ?',
            [req.params.systemId]
        );
        const schedule = scheduleRows[0];

        await connection.end();
        
        if (!schedule) {
            return res.status(404).json({ error: 'No feeding schedule found' });
        }

        res.json(schedule);

    } catch (error) {
        if (connection) await connection.end();
        console.error('Error fetching feeding schedule:', error);
        res.status(500).json({ error: 'Failed to fetch feeding schedule' });
    }
});

// Delete fish feeding schedule
router.delete('/feeding-schedule/:systemId', async (req, res) => {
    let connection;

    try {
        connection = await getDatabase();
        
        await connection.execute(
            'DELETE FROM fish_feeding WHERE system_id = ?',
            [req.params.systemId]
        );

        await connection.end();
        res.json({ success: true, message: 'Feeding schedule deleted successfully' });

    } catch (error) {
        if (connection) await connection.end();
        console.error('Error deleting feeding schedule:', error);
        res.status(500).json({ error: 'Failed to delete feeding schedule' });
    }
});

// Helper function to verify system ownership
async function verifySystemOwnership(systemId, userId) {
    let connection;
    try {
        connection = await getDatabase();
        const [rows] = await connection.execute('SELECT id FROM systems WHERE id = ? AND user_id = ?', 
            [systemId, userId]);
        await connection.end();
        return rows.length > 0;
    } catch (error) {
        if (connection) await connection.end();
        throw error;
    }
}

// Record fish harvest
router.post('/harvest', async (req, res) => {
    const { system_id, tank_number, harvest_date, fish_count, total_weight_kg, average_weight_kg, notes } = req.body;

    // Validate required fields
    if (!system_id || !tank_number || !harvest_date || !fish_count || !total_weight_kg) {
        return res.status(400).json({ 
            error: 'System ID, tank number, harvest date, fish count, and total weight are required' 
        });
    }

    // Verify system ownership
    if (!await verifySystemOwnership(system_id, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    let connection;
    try {
        connection = await getDatabase();
        
        // Start transaction to ensure both operations succeed or fail together
        await connection.execute('START TRANSACTION');
        
        // First, check if tank has enough fish for harvest
        const [inventoryRows] = await connection.execute(`
            SELECT current_count FROM fish_inventory 
            WHERE system_id = ? AND fish_tank_id = ?
        `, [system_id, tank_number]);
        
        if (!inventoryRows || inventoryRows.length === 0 || inventoryRows[0].current_count < fish_count) {
            const currentCount = inventoryRows && inventoryRows.length > 0 ? inventoryRows[0].current_count : 0;
            await connection.execute('ROLLBACK');
            await connection.end();
            return res.status(400).json({ 
                error: `Cannot harvest ${fish_count} fish. Tank ${tank_number} only has ${currentCount} fish available.`
            });
        }
        
        // 1. Insert fish harvest record
        const [result] = await connection.execute(`
            INSERT INTO fish_harvest 
            (system_id, tank_number, harvest_date, fish_count, total_weight_kg, average_weight_kg, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [system_id, tank_number, harvest_date, fish_count, total_weight_kg, average_weight_kg || null, notes || null]);
        
        // 2. Update fish inventory (decrease count)
        await connection.execute(`
            UPDATE fish_inventory 
            SET current_count = current_count - ?, last_updated = NOW()
            WHERE system_id = ? AND fish_tank_id = ?
        `, [fish_count, system_id, tank_number]);
        
        // Commit the transaction
        await connection.execute('COMMIT');
        await connection.end();
        
        res.status(201).json({ 
            id: result.insertId, 
            message: 'Fish harvest recorded successfully',
            data: {
                system_id,
                tank_number,
                harvest_date,
                fish_count,
                total_weight_kg,
                average_weight_kg,
                remaining_count: inventoryRows[0].current_count - fish_count
            }
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.execute('ROLLBACK');
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
            await connection.end();
        }
        console.error('Error recording fish harvest:', error);
        res.status(500).json({ error: 'Failed to record fish harvest' });
    }
});

// Get fish harvest records for a system
router.get('/harvest/:systemId', async (req, res) => {
    const { systemId } = req.params;
    
    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    let connection;
    try {
        connection = await getDatabase();
        
        const [rows] = await connection.execute(`
            SELECT * FROM fish_harvest 
            WHERE system_id = ? 
            ORDER BY harvest_date DESC, created_at DESC
        `, [systemId]);

        await connection.end();
        res.json(rows);

    } catch (error) {
        if (connection) await connection.end();
        console.error('Error fetching fish harvest records:', error);
        res.status(500).json({ error: 'Failed to fetch fish harvest records' });
    }
});

// Get fish harvest records for a specific tank
router.get('/harvest/:systemId/tank/:tankNumber', async (req, res) => {
    const { systemId, tankNumber } = req.params;
    
    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    let connection;
    try {
        connection = await getDatabase();
        
        const [rows] = await connection.execute(`
            SELECT * FROM fish_harvest 
            WHERE system_id = ? AND tank_number = ?
            ORDER BY harvest_date DESC, created_at DESC
        `, [systemId, tankNumber]);

        await connection.end();
        res.json(rows);

    } catch (error) {
        if (connection) await connection.end();
        console.error('Error fetching tank harvest records:', error);
        res.status(500).json({ error: 'Failed to fetch tank harvest records' });
    }
});

module.exports = router;