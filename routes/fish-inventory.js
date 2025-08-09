const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Fish Inventory Management API - MariaDB Version
 * 
 * This provides a clean interface for managing fish populations
 * with proper state management and event logging.
 */

// Helper function to execute queries with promises - MariaDB version
async function executeQuery(connection, query, params = []) {
    const [results] = await connection.execute(query, params);
    return results || [];
}

// Get current fish inventory for a system
router.get('/system/:systemId', async (req, res) => {
    const { systemId } = req.params;
    let connection;

    try {
        connection = await getDatabase();
        
        // Verify system ownership
        const systemRows = await executeQuery(connection,
            'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [systemId, req.user.userId]
        );

        if (!systemRows || systemRows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Get current inventory for all tanks in this system
        const inventory = await executeQuery(connection, `
            SELECT 
                fi.*,
                ft.volume_liters,
                ft.size_m3,
                ft.fish_type as tank_fish_type,
                (fi.current_count * COALESCE(fi.average_weight, 0)) / 1000.0 as biomass_kg,
                CASE 
                    WHEN ft.volume_liters > 0 THEN 
                        (fi.current_count * COALESCE(fi.average_weight, 0)) / ft.volume_liters
                    ELSE 0 
                END as density_kg_m3
            FROM fish_inventory fi
            LEFT JOIN fish_tanks ft ON fi.system_id = ft.system_id AND fi.fish_tank_id = ft.tank_number
            WHERE fi.system_id = ?
            ORDER BY fi.fish_tank_id ASC
        `, [systemId]);

        await connection.end();
        
        res.json({
            system_id: systemId,
            tanks: inventory
        });

    } catch (error) {
        if (connection) await connection.end();
        console.error('Error fetching fish inventory:', error);
        res.status(500).json({ error: 'Failed to fetch fish inventory' });
    }
});

// Add fish to a tank
router.post('/add-fish', async (req, res) => {
    const { system_id, fish_tank_id, count, average_weight, batch_id, notes } = req.body;
    
    if (!system_id || !fish_tank_id || !count || count <= 0) {
        return res.status(400).json({ error: 'System ID, tank ID, and positive count are required' });
    }

    // Convert undefined to null for SQL compatibility
    const safeAverageWeight = average_weight || null;
    const safeBatchId = batch_id || null;
    const safeNotes = notes || null;

    let connection;

    try {
        connection = await getDatabase();
        
        // Start transaction
        await executeQuery(connection, 'START TRANSACTION');

        try {
            // Verify system ownership
            const systemRows = await executeQuery(connection,
                'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
                [system_id, req.user.userId]
            );

            if (!systemRows || systemRows.length === 0) {
                await executeQuery(connection, 'ROLLBACK');
                await connection.end();
                return res.status(404).json({ error: 'System not found or access denied' });
            }

            const eventDate = new Date();

            // 1. Update or create fish inventory using MariaDB syntax
            await executeQuery(connection, `
                INSERT INTO fish_inventory (system_id, fish_tank_id, current_count, average_weight, last_updated)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    current_count = current_count + VALUES(current_count),
                    average_weight = CASE 
                        WHEN VALUES(average_weight) IS NOT NULL THEN VALUES(average_weight)
                        ELSE average_weight 
                    END,
                    last_updated = VALUES(last_updated)
            `, [system_id, fish_tank_id, count, safeAverageWeight, eventDate]);

            // 2. Log the event
            await executeQuery(connection, `
                INSERT INTO fish_events (system_id, fish_tank_id, event_type, count_change, weight, batch_id, notes, event_date, user_id)
                VALUES (?, ?, 'add_fish', ?, ?, ?, ?, ?, ?)
            `, [system_id, fish_tank_id, count, safeAverageWeight, safeBatchId, safeNotes, eventDate, req.user.userId]);

            // Commit transaction
            await executeQuery(connection, 'COMMIT');
            await connection.end();

            res.status(201).json({ 
                message: 'Fish added successfully',
                added_count: count,
                tank_id: fish_tank_id
            });

        } catch (transactionError) {
            // Rollback on error
            await executeQuery(connection, 'ROLLBACK').catch(() => {});
            await connection.end();
            throw transactionError;
        }

    } catch (error) {
        console.error('Error adding fish:', error);
        res.status(500).json({ error: 'Failed to add fish' });
    }
});

// Record fish mortality
router.post('/mortality', async (req, res) => {
    const { system_id, fish_tank_id, count, cause, notes } = req.body;
    
    if (!system_id || !fish_tank_id || !count || count <= 0) {
        return res.status(400).json({ error: 'System ID, tank ID, and positive count are required' });
    }

    // Convert undefined to null for SQL compatibility
    const safeCause = cause || null;
    const safeNotes = notes || null;

    let connection;

    try {
        connection = await getDatabase();
        
        // Start transaction
        await executeQuery(connection, 'START TRANSACTION');

        try {
            // Verify system ownership
            const systemRows = await executeQuery(connection,
                'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
                [system_id, req.user.userId]
            );

            if (!systemRows || systemRows.length === 0) {
                await executeQuery(connection, 'ROLLBACK');
                await connection.end();
                return res.status(404).json({ error: 'System not found or access denied' });
            }

            // Check current inventory
            const inventoryRows = await executeQuery(connection,
                'SELECT * FROM fish_inventory WHERE system_id = ? AND fish_tank_id = ?', 
                [system_id, fish_tank_id]
            );

            if (!inventoryRows || inventoryRows.length === 0 || inventoryRows[0].current_count < count) {
                const currentCount = inventoryRows && inventoryRows.length > 0 ? inventoryRows[0].current_count : 0;
                await executeQuery(connection, 'ROLLBACK');
                await connection.end();
                return res.status(400).json({ 
                    error: `Insufficient fish in tank. Current count: ${currentCount}` 
                });
            }

            const eventDate = new Date();
            const mortalityNotes = `Mortality - ${safeCause || 'Unknown cause'}. ${safeNotes || ''}`.trim();

            // 1. Update fish inventory (decrease count)
            await executeQuery(connection, `
                UPDATE fish_inventory 
                SET current_count = current_count - ?, last_updated = ?
                WHERE system_id = ? AND fish_tank_id = ?
            `, [count, eventDate, system_id, fish_tank_id]);

            // 2. Log the mortality event
            await executeQuery(connection, `
                INSERT INTO fish_events (system_id, fish_tank_id, event_type, count_change, notes, event_date, user_id)
                VALUES (?, ?, 'mortality', ?, ?, ?, ?)
            `, [system_id, fish_tank_id, -count, mortalityNotes, eventDate, req.user.userId]);

            // Commit transaction
            await executeQuery(connection, 'COMMIT');
            await connection.end();

            res.json({ 
                message: 'Mortality recorded successfully',
                removed_count: count,
                tank_id: fish_tank_id,
                remaining_count: inventoryRows[0].current_count - count
            });

        } catch (transactionError) {
            await executeQuery(connection, 'ROLLBACK').catch(() => {});
            await connection.end();
            throw transactionError;
        }

    } catch (error) {
        console.error('Error recording mortality:', error);
        res.status(500).json({ error: 'Failed to record mortality' });
    }
});

// Update fish weight
router.post('/update-weight', async (req, res) => {
    const { system_id, fish_tank_id, average_weight, notes } = req.body;
    
    if (!system_id || !fish_tank_id || !average_weight || average_weight <= 0) {
        return res.status(400).json({ error: 'System ID, tank ID, and positive weight are required' });
    }

    // Convert undefined to null for SQL compatibility
    const safeNotes = notes || null;

    let connection;

    try {
        connection = await getDatabase();
        
        // Start transaction
        await executeQuery(connection, 'START TRANSACTION');

        try {
            // Verify system ownership
            const systemRows = await executeQuery(connection,
                'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
                [system_id, req.user.userId]
            );

            if (!systemRows || systemRows.length === 0) {
                await executeQuery(connection, 'ROLLBACK');
                await connection.end();
                return res.status(404).json({ error: 'System not found or access denied' });
            }

            const eventDate = new Date();

            // 1. Update fish inventory weight
            await executeQuery(connection, `
                INSERT INTO fish_inventory (system_id, fish_tank_id, current_count, average_weight, last_updated)
                VALUES (?, ?, 0, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    average_weight = VALUES(average_weight),
                    last_updated = VALUES(last_updated)
            `, [system_id, fish_tank_id, average_weight, eventDate]);

            // 2. Log the weight update event
            await executeQuery(connection, `
                INSERT INTO fish_events (system_id, fish_tank_id, event_type, count_change, weight, notes, event_date, user_id)
                VALUES (?, ?, 'weight_update', 0, ?, ?, ?, ?)
            `, [system_id, fish_tank_id, average_weight, safeNotes, eventDate, req.user.userId]);

            // Commit transaction
            await executeQuery(connection, 'COMMIT');
            await connection.end();

            res.json({ 
                message: 'Fish weight updated successfully',
                new_weight: average_weight,
                tank_id: fish_tank_id
            });

        } catch (transactionError) {
            await executeQuery(connection, 'ROLLBACK').catch(() => {});
            await connection.end();
            throw transactionError;
        }

    } catch (error) {
        console.error('Error updating fish weight:', error);
        res.status(500).json({ error: 'Failed to update fish weight' });
    }
});

// Get fish events history for a tank
router.get('/events/:systemId/:tankId', async (req, res) => {
    const { systemId, tankId } = req.params;
    const { limit = 50 } = req.query;

    let connection;

    try {
        connection = await getDatabase();
        
        // Verify system ownership
        const systemRows = await executeQuery(connection,
            'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [systemId, req.user.userId]
        );

        if (!systemRows || systemRows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Get events for this tank
        const events = await executeQuery(connection, `
            SELECT * FROM fish_events 
            WHERE system_id = ? AND fish_tank_id = ?
            ORDER BY event_date DESC, created_at DESC
            LIMIT ?
        `, [systemId, tankId, parseInt(limit)]);

        await connection.end();
        
        res.json({
            system_id: systemId,
            tank_id: tankId,
            events: events
        });

    } catch (error) {
        if (connection) await connection.end();
        console.error('Error fetching fish events:', error);
        res.status(500).json({ error: 'Failed to fetch fish events' });
    }
});

module.exports = router;