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
async function executeQuery(pool, query, params = []) {
    const [results] = await pool.execute(query, params);
    return results || [];
}

// Get current fish inventory for a system
router.get('/system/:systemId', async (req, res) => {
    const { systemId } = req.params;
    // Using pool pool - no manual pool management

    try {
        const pool = getDatabase();
        
        // Verify system ownership
        const systemRows = await executeQuery(pool,
            'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [systemId, req.user.userId]
        );

        if (!systemRows || systemRows.length === 0) {            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Get current inventory for all tanks in this system
        // In the new structure, fish count is stored directly in fish_tanks
        const inventory = await executeQuery(pool, `
            SELECT 
                ft.id as fish_tank_id,
                ft.tank_number,
                ft.volume_liters,
                ft.size_m3,
                ft.fish_type as tank_fish_type,
                ft.current_fish_count as current_count,
                -- Calculate average weight from recent fish events
                COALESCE(
                    (SELECT AVG(weight) 
                     FROM fish_events 
                     WHERE system_id = ft.system_id 
                       AND fish_tank_id = ft.id 
                       AND weight IS NOT NULL 
                       AND event_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                     ), 50) as average_weight,
                (ft.current_fish_count * COALESCE(
                    (SELECT AVG(weight) 
                     FROM fish_events 
                     WHERE system_id = ft.system_id 
                       AND fish_tank_id = ft.id 
                       AND weight IS NOT NULL 
                       AND event_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                     ), 50)) / 1000.0 as biomass_kg,
                CASE 
                    WHEN ft.volume_liters > 0 THEN 
                        (ft.current_fish_count * COALESCE(
                            (SELECT AVG(weight) 
                             FROM fish_events 
                             WHERE system_id = ft.system_id 
                               AND fish_tank_id = ft.id 
                               AND weight IS NOT NULL 
                               AND event_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                             ), 50)) / ft.volume_liters
                    ELSE 0 
                END as density_kg_m3,
                NOW() as last_updated
            FROM fish_tanks ft
            WHERE ft.system_id = ?
            ORDER BY ft.tank_number ASC
        `, [systemId]);        
        res.json({
            system_id: systemId,
            tanks: inventory
        });

    } catch (error) {
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

    // Using pool pool - no manual pool management

    try {
        const pool = getDatabase();
        
        // Start transaction
        await executeQuery(pool, 'START TRANSACTION');

        try {
            // Verify system ownership
            const systemRows = await executeQuery(pool,
                'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
                [system_id, req.user.userId]
            );

            if (!systemRows || systemRows.length === 0) {
                await executeQuery(pool, 'ROLLBACK');                return res.status(404).json({ error: 'System not found or access denied' });
            }

            // Map tank_number to actual tank ID
            // First try to get the tank by its ID, if that fails, try by tank_number
            const tankRows = await executeQuery(pool,
                'SELECT id FROM fish_tanks WHERE system_id = ? AND (id = ? OR tank_number = ?)',
                [system_id, fish_tank_id, fish_tank_id]
            );

            if (!tankRows || tankRows.length === 0) {
                await executeQuery(pool, 'ROLLBACK');                return res.status(404).json({ error: 'Tank not found' });
            }

            const actualTankId = tankRows[0].id;
            const eventDate = new Date();

            // 1. Update fish tank current count directly using actual tank ID
            await executeQuery(pool, `
                UPDATE fish_tanks 
                SET current_fish_count = current_fish_count + ?
                WHERE id = ? AND system_id = ?
            `, [count, actualTankId, system_id]);

            // 2. Log the event with actual tank ID
            await executeQuery(pool, `
                INSERT INTO fish_events (system_id, fish_tank_id, event_type, count_change, weight, batch_id, notes, event_date, user_id)
                VALUES (?, ?, 'add_fish', ?, ?, ?, ?, ?, ?)
            `, [system_id, actualTankId, count, safeAverageWeight, safeBatchId, safeNotes, eventDate, req.user.userId]);

            // Commit transaction
            await executeQuery(pool, 'COMMIT');
            res.status(201).json({ 
                message: 'Fish added successfully',
                added_count: count,
                tank_id: fish_tank_id
            });

        } catch (transactionError) {
            // Rollback on error
            await executeQuery(pool, 'ROLLBACK').catch(() => {});            throw transactionError;
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

    // Using pool pool - no manual pool management

    try {
        const pool = getDatabase();
        
        // Start transaction
        await executeQuery(pool, 'START TRANSACTION');

        try {
            // Verify system ownership
            const systemRows = await executeQuery(pool,
                'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
                [system_id, req.user.userId]
            );

            if (!systemRows || systemRows.length === 0) {
                await executeQuery(pool, 'ROLLBACK');                return res.status(404).json({ error: 'System not found or access denied' });
            }

            // Map tank_number to actual tank ID
            const tankMappingRows = await executeQuery(pool,
                'SELECT id, current_fish_count FROM fish_tanks WHERE system_id = ? AND (id = ? OR tank_number = ?)',
                [system_id, fish_tank_id, fish_tank_id]
            );

            if (!tankMappingRows || tankMappingRows.length === 0) {
                await executeQuery(pool, 'ROLLBACK');                return res.status(404).json({ error: 'Tank not found' });
            }

            const actualTankId = tankMappingRows[0].id;
            const currentCount = tankMappingRows[0].current_fish_count;

            if (currentCount < count) {
                await executeQuery(pool, 'ROLLBACK');                return res.status(400).json({ 
                    error: `Insufficient fish in tank. Current count: ${currentCount}` 
                });
            }

            const eventDate = new Date();
            const mortalityNotes = `Mortality - ${safeCause || 'Unknown cause'}. ${safeNotes || ''}`.trim();

            // 1. Update fish tank count (decrease count) using actual tank ID
            await executeQuery(pool, `
                UPDATE fish_tanks 
                SET current_fish_count = GREATEST(0, current_fish_count - ?)
                WHERE id = ? AND system_id = ?
            `, [count, actualTankId, system_id]);

            // 2. Log the mortality event with actual tank ID
            await executeQuery(pool, `
                INSERT INTO fish_events (system_id, fish_tank_id, event_type, count_change, notes, event_date, user_id)
                VALUES (?, ?, 'mortality', ?, ?, ?, ?)
            `, [system_id, actualTankId, -count, mortalityNotes, eventDate, req.user.userId]);

            // Commit transaction
            await executeQuery(pool, 'COMMIT');
            res.json({ 
                message: 'Mortality recorded successfully',
                removed_count: count,
                tank_id: actualTankId,
                remaining_count: currentCount - count
            });

        } catch (transactionError) {
            await executeQuery(pool, 'ROLLBACK').catch(() => {});            throw transactionError;
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

    // Using pool pool - no manual pool management

    try {
        const pool = getDatabase();
        
        // Start transaction
        await executeQuery(pool, 'START TRANSACTION');

        try {
            // Verify system ownership
            const systemRows = await executeQuery(pool,
                'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
                [system_id, req.user.userId]
            );

            if (!systemRows || systemRows.length === 0) {
                await executeQuery(pool, 'ROLLBACK');                return res.status(404).json({ error: 'System not found or access denied' });
            }

            // Map tank_number to actual tank ID
            const tankRows = await executeQuery(pool,
                'SELECT id FROM fish_tanks WHERE system_id = ? AND (id = ? OR tank_number = ?)',
                [system_id, fish_tank_id, fish_tank_id]
            );

            if (!tankRows || tankRows.length === 0) {
                await executeQuery(pool, 'ROLLBACK');                return res.status(404).json({ error: 'Tank not found' });
            }

            const actualTankId = tankRows[0].id;
            const eventDate = new Date();

            // 1. Log weight update event (no direct weight storage in fish_tanks)
            // Weight is calculated from recent fish_events records

            // 2. Log the weight update event with actual tank ID
            await executeQuery(pool, `
                INSERT INTO fish_events (system_id, fish_tank_id, event_type, count_change, weight, notes, event_date, user_id)
                VALUES (?, ?, 'weight_update', 0, ?, ?, ?, ?)
            `, [system_id, actualTankId, average_weight, safeNotes, eventDate, req.user.userId]);

            // Commit transaction
            await executeQuery(pool, 'COMMIT');
            res.json({ 
                message: 'Fish weight updated successfully',
                new_weight: average_weight,
                tank_id: actualTankId
            });

        } catch (transactionError) {
            await executeQuery(pool, 'ROLLBACK').catch(() => {});            throw transactionError;
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

    // Using pool pool - no manual pool management

    try {
        const pool = getDatabase();
        
        // Verify system ownership
        const systemRows = await executeQuery(pool,
            'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [systemId, req.user.userId]
        );

        if (!systemRows || systemRows.length === 0) {            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Get events for this tank
        const events = await executeQuery(pool, `
            SELECT * FROM fish_events 
            WHERE system_id = ? AND fish_tank_id = ?
            ORDER BY event_date DESC, created_at DESC
            LIMIT ?
        `, [systemId, tankId, parseInt(limit)]);        
        res.json({
            system_id: systemId,
            tank_id: tankId,
            events: events
        });

    } catch (error) {
        console.error('Error fetching fish events:', error);
        res.status(500).json({ error: 'Failed to fetch fish events' });
    }
});

module.exports = router;