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
                ft.max_stocking_density,
                ft.current_fish_count as current_count,
                -- Use most recent weight from fish events instead of historical average
                COALESCE(
                    (SELECT weight 
                     FROM fish_events 
                     WHERE system_id = ft.system_id 
                       AND fish_tank_id = ft.id 
                       AND weight IS NOT NULL 
                       AND event_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                     ORDER BY (event_type = 'weight_update') DESC, event_date DESC 
                     LIMIT 1
                     ), 50) as average_weight,
                (ft.current_fish_count * COALESCE(
                    (SELECT weight 
                     FROM fish_events 
                     WHERE system_id = ft.system_id 
                       AND fish_tank_id = ft.id 
                       AND weight IS NOT NULL 
                       AND event_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                     ORDER BY (event_type = 'weight_update') DESC, event_date DESC 
                     LIMIT 1
                     ), 50)) / 1000.0 as biomass_kg,
                CASE 
                    WHEN ft.volume_liters > 0 THEN 
                        (ft.current_fish_count * COALESCE(
                            (SELECT weight 
                             FROM fish_events 
                             WHERE system_id = ft.system_id 
                               AND fish_tank_id = ft.id 
                               AND weight IS NOT NULL 
                               AND event_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                             ORDER BY (event_type = 'weight_update') DESC, event_date DESC 
                             LIMIT 1
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
    const { system_id, fish_tank_id, average_weight, notes, date } = req.body;

    if (!system_id || !fish_tank_id || !average_weight || average_weight <= 0) {
        return res.status(400).json({ error: 'System ID, tank ID, and positive weight are required' });
    }

    // Convert undefined to null for SQL compatibility
    const safeNotes = notes || null;

    // Date the weighing was taken. Stored at noon to avoid the reading
    // shifting a day under timezone conversion. Falls back to now.
    let eventDate = new Date();
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const parsed = new Date(`${date}T12:00:00`);
        if (!isNaN(parsed.getTime())) eventDate = parsed;
    }

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

// Move fish between two tanks in the same system
router.post('/move-fish', async (req, res) => {
    const { system_id, from_tank_id, to_tank_id, count, notes } = req.body;

    if (!system_id || !from_tank_id || !to_tank_id || !count || count <= 0) {
        return res.status(400).json({ error: 'System ID, source tank, destination tank, and positive count are required' });
    }
    if (String(from_tank_id) === String(to_tank_id)) {
        return res.status(400).json({ error: 'Source and destination tanks must be different' });
    }

    const safeNotes = notes || null;

    try {
        const pool = getDatabase();
        await executeQuery(pool, 'START TRANSACTION');

        try {
            // Verify system ownership
            const systemRows = await executeQuery(pool,
                'SELECT * FROM systems WHERE id = ? AND user_id = ?',
                [system_id, req.user.userId]
            );
            if (!systemRows || systemRows.length === 0) {
                await executeQuery(pool, 'ROLLBACK');
                return res.status(404).json({ error: 'System not found or access denied' });
            }

            // Map both tanks (accept tank id or tank_number)
            const fromRows = await executeQuery(pool,
                'SELECT id, current_fish_count FROM fish_tanks WHERE system_id = ? AND (id = ? OR tank_number = ?)',
                [system_id, from_tank_id, from_tank_id]
            );
            const toRows = await executeQuery(pool,
                'SELECT id FROM fish_tanks WHERE system_id = ? AND (id = ? OR tank_number = ?)',
                [system_id, to_tank_id, to_tank_id]
            );
            if (!fromRows || fromRows.length === 0 || !toRows || toRows.length === 0) {
                await executeQuery(pool, 'ROLLBACK');
                return res.status(404).json({ error: 'Tank not found' });
            }

            const fromId = fromRows[0].id;
            const toId = toRows[0].id;
            const fromCount = fromRows[0].current_fish_count;

            if (fromId === toId) {
                await executeQuery(pool, 'ROLLBACK');
                return res.status(400).json({ error: 'Source and destination tanks must be different' });
            }
            if (fromCount < count) {
                await executeQuery(pool, 'ROLLBACK');
                return res.status(400).json({ error: `Insufficient fish in source tank. Current count: ${fromCount}` });
            }

            // Carry the source tank's most recent weight so the destination's
            // biomass/density stays realistic after the move.
            const weightRows = await executeQuery(pool, `
                SELECT weight FROM fish_events
                WHERE system_id = ? AND fish_tank_id = ? AND weight IS NOT NULL
                  AND event_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ORDER BY event_date DESC LIMIT 1
            `, [system_id, fromId]);
            const carryWeight = weightRows.length > 0 ? weightRows[0].weight : null;

            const eventDate = new Date();
            const moveNotes = `Moved ${count} fish. ${safeNotes || ''}`.trim();

            // Decrement source, increment destination
            await executeQuery(pool, `
                UPDATE fish_tanks SET current_fish_count = GREATEST(0, current_fish_count - ?)
                WHERE id = ? AND system_id = ?
            `, [count, fromId, system_id]);
            await executeQuery(pool, `
                UPDATE fish_tanks SET current_fish_count = current_fish_count + ?
                WHERE id = ? AND system_id = ?
            `, [count, toId, system_id]);

            // Log both sides of the move
            await executeQuery(pool, `
                INSERT INTO fish_events (system_id, fish_tank_id, event_type, count_change, weight, notes, event_date, user_id)
                VALUES (?, ?, 'move_out', ?, ?, ?, ?, ?)
            `, [system_id, fromId, -count, carryWeight, moveNotes, eventDate, req.user.userId]);
            await executeQuery(pool, `
                INSERT INTO fish_events (system_id, fish_tank_id, event_type, count_change, weight, notes, event_date, user_id)
                VALUES (?, ?, 'move_in', ?, ?, ?, ?, ?)
            `, [system_id, toId, count, carryWeight, moveNotes, eventDate, req.user.userId]);

            await executeQuery(pool, 'COMMIT');
            res.json({
                message: 'Fish moved successfully',
                moved_count: count,
                from_tank_id: fromId,
                to_tank_id: toId
            });

        } catch (transactionError) {
            await executeQuery(pool, 'ROLLBACK').catch(() => {});
            throw transactionError;
        }

    } catch (error) {
        console.error('Error moving fish:', error);
        res.status(500).json({ error: 'Failed to move fish' });
    }
});

// Harvest fish from a tank (removal for sale/consumption)
router.post('/harvest', async (req, res) => {
    const { system_id, fish_tank_id, count, total_weight_kg, notes } = req.body;

    if (!system_id || !fish_tank_id || !count || count <= 0) {
        return res.status(400).json({ error: 'System ID, tank ID, and positive count are required' });
    }

    // Capture the total harvest weight and derive the per-fish average (grams).
    const totalKg = total_weight_kg && total_weight_kg > 0 ? Number(total_weight_kg) : null;
    const avgWeight = totalKg ? (totalKg * 1000) / count : null;
    const safeNotes = notes || null;

    try {
        const pool = getDatabase();
        await executeQuery(pool, 'START TRANSACTION');

        try {
            // Verify system ownership
            const systemRows = await executeQuery(pool,
                'SELECT * FROM systems WHERE id = ? AND user_id = ?',
                [system_id, req.user.userId]
            );
            if (!systemRows || systemRows.length === 0) {
                await executeQuery(pool, 'ROLLBACK');
                return res.status(404).json({ error: 'System not found or access denied' });
            }

            const tankRows = await executeQuery(pool,
                'SELECT id, current_fish_count FROM fish_tanks WHERE system_id = ? AND (id = ? OR tank_number = ?)',
                [system_id, fish_tank_id, fish_tank_id]
            );
            if (!tankRows || tankRows.length === 0) {
                await executeQuery(pool, 'ROLLBACK');
                return res.status(404).json({ error: 'Tank not found' });
            }

            const actualTankId = tankRows[0].id;
            const currentCount = tankRows[0].current_fish_count;

            if (currentCount < count) {
                await executeQuery(pool, 'ROLLBACK');
                return res.status(400).json({ error: `Insufficient fish in tank. Current count: ${currentCount}` });
            }

            const eventDate = new Date();
            const eventWeight = avgWeight ? avgWeight.toFixed(2) : null;
            const harvestNotes = `Harvested ${count} fish${totalKg ? ` (${totalKg.toFixed(2)} kg, avg ${Math.round(avgWeight)} g)` : ''}. ${safeNotes || ''}`.trim();

            await executeQuery(pool, `
                UPDATE fish_tanks SET current_fish_count = GREATEST(0, current_fish_count - ?)
                WHERE id = ? AND system_id = ?
            `, [count, actualTankId, system_id]);

            await executeQuery(pool, `
                INSERT INTO fish_events (system_id, fish_tank_id, event_type, count_change, weight, notes, event_date, user_id)
                VALUES (?, ?, 'harvest', ?, ?, ?, ?, ?)
            `, [system_id, actualTankId, -count, eventWeight, harvestNotes, eventDate, req.user.userId]);

            await executeQuery(pool, 'COMMIT');
            res.json({
                message: 'Harvest recorded successfully',
                harvested_count: count,
                tank_id: actualTankId,
                remaining_count: currentCount - count,
                total_weight_kg: totalKg,
                average_weight_g: avgWeight ? Math.round(avgWeight) : null
            });

        } catch (transactionError) {
            await executeQuery(pool, 'ROLLBACK').catch(() => {});
            throw transactionError;
        }

    } catch (error) {
        console.error('Error harvesting fish:', error);
        res.status(500).json({ error: 'Failed to harvest fish' });
    }
});

// Reconstructed system average stocking density over time.
// Density isn't stored, so we rebuild each tank's fish count and weight back
// through the fish_events log (starting from the current state and unwinding
// the logged deltas), then aggregate biomass / volume across all tanks per day.
router.get('/density-history/:systemId', async (req, res) => {
    const { systemId } = req.params;
    const days = Math.min(365, Math.max(7, parseInt(req.query.days, 10) || 90));

    try {
        const pool = getDatabase();

        const systemRows = await executeQuery(pool,
            'SELECT id FROM systems WHERE id = ? AND user_id = ?',
            [systemId, req.user.userId]
        );
        if (!systemRows || systemRows.length === 0) {
            return res.status(404).json({ error: 'System not found or access denied' });
        }

        const tanks = await executeQuery(pool,
            'SELECT id, size_m3, volume_liters, current_fish_count FROM fish_tanks WHERE system_id = ?',
            [systemId]
        );
        if (!tanks || tanks.length === 0) {
            return res.json({ system_id: systemId, days, series: [] });
        }

        const events = await executeQuery(pool,
            `SELECT fish_tank_id, count_change, weight, event_date
             FROM fish_events WHERE system_id = ? ORDER BY event_date ASC`,
            [systemId]
        );

        const DEFAULT_WEIGHT = 50; // matches the inventory query's fallback
        const toKey = (d) => {
            const dt = new Date(d);
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        // Reconstruct a baseline (pre-history) count and weight per tank.
        const perTank = tanks.map((t) => {
            const vol = Number(t.size_m3) > 0 ? Number(t.size_m3) : (Number(t.volume_liters) || 0) / 1000;
            const evs = events
                .filter((e) => e.fish_tank_id === t.id)
                .map((e) => ({ key: toKey(e.event_date), delta: Number(e.count_change) || 0, weight: e.weight != null ? Number(e.weight) : null }));
            const totalDelta = evs.reduce((s, e) => s + e.delta, 0);
            const baselineCount = (Number(t.current_fish_count) || 0) - totalDelta;
            const firstWeight = evs.find((e) => e.weight != null);
            return { vol, evs, baselineCount, baselineWeight: firstWeight ? firstWeight.weight : DEFAULT_WEIGHT };
        });

        // Walk the day window and compute the aggregate density at each day's end.
        const end = new Date();
        const series = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(end);
            d.setDate(end.getDate() - i);
            const key = toKey(d);
            let biomass = 0;
            let volume = 0;
            for (const t of perTank) {
                volume += t.vol;
                let count = t.baselineCount;
                let weight = t.baselineWeight;
                for (const e of t.evs) {
                    if (e.key <= key) {
                        count += e.delta;
                        if (e.weight != null) weight = e.weight;
                    }
                }
                biomass += (Math.max(0, count) * weight) / 1000;
            }
            series.push({
                date: key,
                density: volume > 0 ? Number((biomass / volume).toFixed(3)) : 0,
                biomass_kg: Number(biomass.toFixed(2)),
            });
        }

        res.json({ system_id: systemId, days, series });

    } catch (error) {
        console.error('Error building density history:', error);
        res.status(500).json({ error: 'Failed to build density history' });
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