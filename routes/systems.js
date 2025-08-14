const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all systems for authenticated user
router.get('/', async (req, res) => {
    let connection;

    try {
        connection = await getDatabase();

        const [systems] = await connection.execute(
            'SELECT * FROM systems WHERE user_id = ? ORDER BY created_at DESC', 
            [req.user.userId]
        );

        await connection.end();
        res.json(systems);

    } catch (error) {
        if (connection) await connection.end();
        console.error('Error fetching systems:', error);
        res.status(500).json({ error: 'Failed to fetch systems' });
    }
});

// Get specific system
router.get('/:id', async (req, res) => {
    let connection;

    try {
        connection = await getDatabase();

        const [systemRows] = await connection.execute(
            'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [req.params.id, req.user.userId]
        );

        await connection.end();

        if (systemRows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        res.json(systemRows[0]);

    } catch (error) {
        if (connection) await connection.end();
        console.error('Error fetching system:', error);
        res.status(500).json({ error: 'Failed to fetch system' });
    }
});

// Create new system
router.post('/', async (req, res) => {
    const {
        id,
        system_name,
        system_type,
        fish_type,
        fish_tank_count,
        total_fish_volume,
        grow_bed_count,
        total_grow_volume,
        total_grow_area
    } = req.body;

    if (!id || !system_name) {
        return res.status(400).json({ error: 'System ID and name are required' });
    }

    let connection;

    try {
        connection = await getDatabase();
        
        const [result] = await connection.execute(`INSERT INTO systems 
            (id, user_id, system_name, system_type, fish_type, fish_tank_count, total_fish_volume, grow_bed_count, total_grow_volume, total_grow_area) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [id, req.user.userId, system_name, system_type || 'media-bed', fish_type || 'tilapia',
             fish_tank_count || 1, total_fish_volume || 1000, 
             grow_bed_count || 4, total_grow_volume || 800, total_grow_area || 2.0]
        );

        // Return the created system
        const [createdSystemRows] = await connection.execute('SELECT * FROM systems WHERE id = ?', [id]);
        const createdSystem = createdSystemRows[0];

        await connection.end();
        res.status(201).json(createdSystem);

    } catch (error) {
        if (connection) await connection.end();
        console.error('Error creating system:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'System ID already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create system' });
        }
    }
});

// Update system
router.put('/:id', async (req, res) => {
    const {
        system_name,
        system_type,
        fish_type,
        fish_tank_count,
        total_fish_volume,
        grow_bed_count,
        total_grow_volume,
        total_grow_area
    } = req.body;

    // Only include fields that are actually provided in the request
    const updateFields = [];
    const updateValues = [];

    if (system_name !== undefined) {
        updateFields.push('system_name = ?');
        updateValues.push(system_name);
    }
    if (system_type !== undefined) {
        updateFields.push('system_type = ?');
        updateValues.push(system_type);
    }
    if (fish_type !== undefined) {
        updateFields.push('fish_type = ?');
        updateValues.push(fish_type);
    }
    if (fish_tank_count !== undefined) {
        updateFields.push('fish_tank_count = ?');
        updateValues.push(fish_tank_count !== null ? parseInt(fish_tank_count, 10) : null);
    }
    if (total_fish_volume !== undefined) {
        updateFields.push('total_fish_volume = ?');
        updateValues.push(total_fish_volume !== null ? parseFloat(total_fish_volume) : null);
    }
    if (grow_bed_count !== undefined) {
        updateFields.push('grow_bed_count = ?');
        updateValues.push(grow_bed_count !== null ? parseInt(grow_bed_count, 10) : null);
    }
    if (total_grow_volume !== undefined) {
        updateFields.push('total_grow_volume = ?');
        updateValues.push(total_grow_volume !== null ? parseFloat(total_grow_volume) : null);
    }
    if (total_grow_area !== undefined) {
        updateFields.push('total_grow_area = ?');
        updateValues.push(total_grow_area !== null ? parseFloat(total_grow_area) : null);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    let connection;

    try {
        connection = await getDatabase();
        
        const query = `UPDATE systems SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`;
        const [result] = await connection.execute(query, [...updateValues, req.params.id, req.user.userId]);

        if (result.affectedRows === 0) {
            await connection.end();
            return res.status(404).json({ error: 'System not found' });
        }

        // Return the updated system
        const [updatedSystemRows] = await connection.execute('SELECT * FROM systems WHERE id = ?', [req.params.id]);
        const updatedSystem = updatedSystemRows[0];

        await connection.end();
        res.json(updatedSystem);

    } catch (error) {
        if (connection) await connection.end();
        console.error('Error updating system:', error);
        res.status(500).json({ error: 'Failed to update system' });
    }
});

// Create demo system by copying Oribi 1 data
router.post('/create-demo', async (req, res) => {
    const { system_name, user_id } = req.body;
    const ORIBI_1_SYSTEM_ID = 'system_1754627714554'; // Oribi 1 reference system
    
    if (!system_name) {
        return res.status(400).json({ error: 'System name is required' });
    }

    let connection;

    try {
        connection = await getDatabase();
        
        // Generate new system ID
        const newSystemId = `system_${Date.now()}`;
        const targetUserId = user_id || req.user.userId;
        
        // Start transaction
        await connection.execute('START TRANSACTION');
        
        // 1. Copy main system record
        await connection.execute(`
            INSERT INTO systems (id, user_id, system_name, system_type, fish_type, fish_tank_count, 
                                total_fish_volume, grow_bed_count, total_grow_volume, total_grow_area)
            SELECT ?, ?, ?, system_type, fish_type, fish_tank_count, 
                   total_fish_volume, grow_bed_count, total_grow_volume, total_grow_area
            FROM systems WHERE id = ?
        `, [newSystemId, targetUserId, system_name, ORIBI_1_SYSTEM_ID]);
        
        // 2. Copy grow beds and create ID mapping
        const [originalBeds] = await connection.execute(
            'SELECT id, bed_number FROM grow_beds WHERE system_id = ? ORDER BY bed_number', 
            [ORIBI_1_SYSTEM_ID]
        );
        
        await connection.execute(`
            INSERT INTO grow_beds (system_id, bed_number, bed_type, bed_name, volume_liters, area_m2, 
                                 length_meters, width_meters, height_meters, plant_capacity, vertical_count, 
                                 plants_per_vertical, equivalent_m2, reservoir_volume, trough_length, 
                                 trough_count, plant_spacing, reservoir_volume_liters)
            SELECT ?, bed_number, bed_type, bed_name, volume_liters, area_m2, length_meters, width_meters, 
                   height_meters, plant_capacity, vertical_count, plants_per_vertical, equivalent_m2, 
                   reservoir_volume, trough_length, trough_count, plant_spacing, reservoir_volume_liters
            FROM grow_beds WHERE system_id = ? ORDER BY bed_number
        `, [newSystemId, ORIBI_1_SYSTEM_ID]);
        
        const [newBeds] = await connection.execute(
            'SELECT id, bed_number FROM grow_beds WHERE system_id = ? ORDER BY bed_number', 
            [newSystemId]
        );
        
        // Create bed ID mapping
        const bedIdMapping = {};
        originalBeds.forEach((originalBed, index) => {
            bedIdMapping[originalBed.id] = newBeds[index].id;
        });
        
        // 3. Copy fish tanks and create ID mapping
        const [originalTanks] = await connection.execute(
            'SELECT id, tank_number FROM fish_tanks WHERE system_id = ? ORDER BY tank_number', 
            [ORIBI_1_SYSTEM_ID]
        );
        
        await connection.execute(`
            INSERT INTO fish_tanks (system_id, tank_number, size_m3, volume_liters, fish_type, current_fish_count)
            SELECT ?, tank_number, size_m3, volume_liters, fish_type, current_fish_count
            FROM fish_tanks WHERE system_id = ? ORDER BY tank_number
        `, [newSystemId, ORIBI_1_SYSTEM_ID]);
        
        const [newTanks] = await connection.execute(
            'SELECT id, tank_number FROM fish_tanks WHERE system_id = ? ORDER BY tank_number', 
            [newSystemId]
        );
        
        // Create tank ID mapping
        const tankIdMapping = {};
        originalTanks.forEach((originalTank, index) => {
            tankIdMapping[originalTank.id] = newTanks[index].id;
        });
        
        // 4. Copy plant allocations using bed ID mapping
        for (const [originalBedId, newBedId] of Object.entries(bedIdMapping)) {
            await connection.execute(`
                INSERT INTO plant_allocations (system_id, grow_bed_id, crop_type, percentage_allocated, 
                                             plants_planted, plant_spacing, date_planted, status)
                SELECT ?, ?, crop_type, percentage_allocated, plants_planted, plant_spacing, 
                       date_planted, status
                FROM plant_allocations WHERE system_id = ? AND grow_bed_id = ?
            `, [newSystemId, newBedId, ORIBI_1_SYSTEM_ID, originalBedId]);
        }
        
        // 5. Copy sample plant growth data (recent 30 days worth) with proper bed ID mapping
        for (const [originalBedId, newBedId] of Object.entries(bedIdMapping)) {
            await connection.execute(`
                INSERT INTO plant_growth (system_id, grow_bed_id, crop_type, date, count, plants_harvested, 
                                        harvest_weight, new_seedlings, pest_control, health, growth_stage, 
                                        batch_id, seed_variety, batch_created_date, days_to_harvest, notes)
                SELECT ?, ?, crop_type, date, count, plants_harvested, harvest_weight, new_seedlings, 
                       pest_control, health, growth_stage, 
                       CONCAT(?, '_batch_', SUBSTRING_INDEX(batch_id, '_batch_', -1)), 
                       seed_variety, batch_created_date, days_to_harvest, notes
                FROM plant_growth 
                WHERE system_id = ? AND grow_bed_id = ? AND date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [newSystemId, newBedId, newSystemId, ORIBI_1_SYSTEM_ID, originalBedId]);
        }
        
        // 6. Copy sample fish health data (recent 30 days worth) with proper tank ID mapping
        for (const [originalTankId, newTankId] of Object.entries(tankIdMapping)) {
            await connection.execute(`
                INSERT INTO fish_health (system_id, fish_tank_id, date, count, average_weight, mortality, 
                                       feed_consumption, feed_type, behavior, notes)
                SELECT ?, ?, date, count, average_weight, mortality, feed_consumption, feed_type, behavior, notes
                FROM fish_health 
                WHERE system_id = ? AND fish_tank_id = ? AND date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [newSystemId, newTankId, ORIBI_1_SYSTEM_ID, originalTankId]);
        }
        
        // 7. Copy sample water quality data (recent 30 days worth)
        await connection.execute(`
            INSERT INTO water_quality (system_id, date, temperature, ph, ammonia, nitrite, nitrate, 
                                     dissolved_oxygen, humidity, salinity, notes, created_at)
            SELECT ?, DATE_SUB(NOW(), INTERVAL DATEDIFF(NOW(), date) DAY), temperature, ph, ammonia, 
                   nitrite, nitrate, dissolved_oxygen, humidity, salinity, notes, NOW()
            FROM water_quality 
            WHERE system_id = ? AND date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `, [newSystemId, ORIBI_1_SYSTEM_ID]);
        
        // 8. Copy sample nutrient readings (recent 30 days worth)
        await connection.execute(`
            INSERT INTO nutrient_readings (system_id, reading_date, nutrient_type, value, unit, 
                                         source, notes, created_at)
            SELECT ?, DATE_SUB(NOW(), INTERVAL DATEDIFF(NOW(), reading_date) DAY), nutrient_type, 
                   value, unit, source, notes, NOW()
            FROM nutrient_readings 
            WHERE system_id = ? AND reading_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `, [newSystemId, ORIBI_1_SYSTEM_ID]);
        
        // Commit transaction
        await connection.execute('COMMIT');
        
        console.log('Transaction committed, waiting 100ms before SELECT...');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Return the created system
        const [createdSystemRows] = await connection.execute('SELECT * FROM systems WHERE id = ?', [newSystemId]);
        const createdSystem = createdSystemRows[0];
        
        console.log('Demo system creation debug:');
        console.log('- New system ID:', newSystemId);
        console.log('- Query result rows count:', createdSystemRows.length);
        console.log('- Created system object:', createdSystem);
        
        if (!createdSystem) {
            console.error('CRITICAL: Failed to retrieve created system from database');
            await connection.end();
            return res.status(500).json({ 
                error: 'System was created but could not be retrieved',
                system_id: newSystemId 
            });
        }
        
        await connection.end();
        
        const response = {
            ...createdSystem,
            message: 'Demo system created successfully with Oribi 1 reference data'
        };
        
        console.log('Final response object:', response);
        console.log('Response has ID:', !!response.id);
        
        res.status(201).json(response);
        
    } catch (error) {
        if (connection) {
            try {
                await connection.execute('ROLLBACK');
                await connection.end();
            } catch (rollbackError) {
                console.error('Error during rollback:', rollbackError);
            }
        }
        
        console.error('Failed to create demo system:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
        
        res.status(500).json({ 
            error: 'Failed to create demo system',
            details: error.message,
            system_name: system_name || 'unknown'
        });
    }
});

// Delete system
router.delete('/:id', async (req, res) => {
    let connection;

    try {
        connection = await getDatabase();
        
        // First verify the system exists and belongs to the user
        const [systemRows] = await connection.execute('SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [req.params.id, req.user.userId]);
        const system = systemRows[0];

        if (!system) {
            await connection.end();
            return res.status(404).json({ error: 'System not found' });
        }

        // Delete all related data in the correct order (to handle foreign key constraints)
        
        // Delete plant allocations
        await connection.execute('DELETE FROM plant_allocations WHERE system_id = ?', [req.params.id]);

        // Delete nutrient readings (consolidated table)
        await connection.execute('DELETE FROM nutrient_readings WHERE system_id = ?', [req.params.id]);

        // Delete plant growth records
        await connection.execute('DELETE FROM plant_growth WHERE system_id = ?', [req.params.id]);

        // Delete fish health records
        await connection.execute('DELETE FROM fish_health WHERE system_id = ?', [req.params.id]);

        // Delete grow beds
        await connection.execute('DELETE FROM grow_beds WHERE system_id = ?', [req.params.id]);

        // Finally delete the system itself
        await connection.execute('DELETE FROM systems WHERE id = ? AND user_id = ?', 
            [req.params.id, req.user.userId]);

        await connection.end();
        res.json({ message: 'System and all related data deleted successfully' });

    } catch (error) {
        if (connection) await connection.end();
        console.error('Error deleting system:', error);
        res.status(500).json({ error: 'Failed to delete system' });
    }
});

module.exports = router;