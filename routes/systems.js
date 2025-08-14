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

    // Validate user authentication and get user ID
    let targetUserId;
    if (user_id) {
        targetUserId = user_id;
    } else if (req.user && req.user.userId) {
        targetUserId = req.user.userId;
    } else {
        console.error('No valid user ID found in request');
        return res.status(401).json({ error: 'User authentication required' });
    }

    console.log('Creating demo system for user:', targetUserId);
    
    let connection;

    try {
        connection = await getDatabase();
        
        // First verify the reference system exists
        const [referenceSystemRows] = await connection.execute(
            'SELECT id, user_id FROM systems WHERE id = ?', 
            [ORIBI_1_SYSTEM_ID]
        );
        
        if (referenceSystemRows.length === 0) {
            console.error('Reference system not found:', ORIBI_1_SYSTEM_ID);
            return res.status(404).json({ error: 'Reference demo system not available' });
        }
        
        console.log('Reference system found:', referenceSystemRows[0]);
        
        // Generate new system ID
        const newSystemId = `system_${Date.now()}`;
        console.log('Generated new system ID:', newSystemId);
        
        // Start transaction with proper isolation
        await connection.execute('START TRANSACTION');
        console.log('Transaction started');
        
        try {
            // 1. Copy main system record
            console.log('Step 1: Copying main system record...');
            const [systemInsertResult] = await connection.execute(`
                INSERT INTO systems (id, user_id, system_name, system_type, fish_type, fish_tank_count, 
                                    total_fish_volume, grow_bed_count, total_grow_volume, total_grow_area)
                SELECT ?, ?, ?, system_type, fish_type, fish_tank_count, 
                       total_fish_volume, grow_bed_count, total_grow_volume, total_grow_area
                FROM systems WHERE id = ?
            `, [newSystemId, targetUserId, system_name, ORIBI_1_SYSTEM_ID]);
            
            console.log('System INSERT result:', { affectedRows: systemInsertResult.affectedRows });
        
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
        
        // 5. Copy sample plant growth data (all available data, adjust dates to recent) with proper bed ID mapping
        for (const [originalBedId, newBedId] of Object.entries(bedIdMapping)) {
            await connection.execute(`
                INSERT INTO plant_growth (system_id, grow_bed_id, crop_type, date, count, plants_harvested, 
                                        harvest_weight, new_seedlings, pest_control, health, growth_stage, 
                                        batch_id, seed_variety, batch_created_date, days_to_harvest, notes)
                SELECT ?, ?, crop_type, 
                       DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ROW_NUMBER() OVER (ORDER BY date DESC) DAY), '%Y-%m-%d'),
                       count, plants_harvested, harvest_weight, new_seedlings, 
                       pest_control, health, growth_stage, 
                       CONCAT(?, '_batch_', SUBSTRING_INDEX(batch_id, '_batch_', -1)), 
                       seed_variety, 
                       DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ROW_NUMBER() OVER (ORDER BY date DESC) DAY), '%Y-%m-%d'),
                       days_to_harvest, notes
                FROM plant_growth 
                WHERE system_id = ? AND grow_bed_id = ?
            `, [newSystemId, newBedId, newSystemId, ORIBI_1_SYSTEM_ID, originalBedId]);
        }
        
        // 6. Copy sample fish health data (all available data, adjust dates to recent) with proper tank ID mapping
        for (const [originalTankId, newTankId] of Object.entries(tankIdMapping)) {
            await connection.execute(`
                INSERT INTO fish_health (system_id, fish_tank_id, date, count, average_weight, mortality, 
                                       feed_consumption, feed_type, behavior, notes)
                SELECT ?, ?, 
                       DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ROW_NUMBER() OVER (ORDER BY date DESC) DAY), '%Y-%m-%d'),
                       count, average_weight, mortality, feed_consumption, feed_type, behavior, notes
                FROM fish_health 
                WHERE system_id = ? AND fish_tank_id = ?
            `, [newSystemId, newTankId, ORIBI_1_SYSTEM_ID, originalTankId]);
        }
        
        // 7. Copy sample water quality data (all available data, adjust dates to recent)
        await connection.execute(`
            INSERT INTO water_quality (system_id, date, temperature, ph, ammonia, nitrite, nitrate, 
                                     dissolved_oxygen, humidity, salinity, notes, created_at)
            SELECT ?, DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ROW_NUMBER() OVER (ORDER BY date DESC) DAY), '%Y-%m-%d'), 
                   temperature, ph, ammonia, nitrite, nitrate, dissolved_oxygen, humidity, salinity, notes, NOW()
            FROM water_quality 
            WHERE system_id = ?
        `, [newSystemId, ORIBI_1_SYSTEM_ID]);
        
        // 8. Copy sample nutrient readings (all available data, adjust dates to recent)
        await connection.execute(`
            INSERT INTO nutrient_readings (system_id, reading_date, nutrient_type, value, unit, 
                                         source, notes, created_at)
            SELECT ?, DATE_SUB(NOW(), INTERVAL ROW_NUMBER() OVER (ORDER BY reading_date DESC) DAY), 
                   nutrient_type, value, unit, source, notes, NOW()
            FROM nutrient_readings 
            WHERE system_id = ?
        `, [newSystemId, ORIBI_1_SYSTEM_ID]);
        
        // 9. Copy fish inventory data with proper tank ID mapping
        for (const [originalTankId, newTankId] of Object.entries(tankIdMapping)) {
            await connection.execute(`
                INSERT INTO fish_inventory (system_id, fish_tank_id, current_count, average_weight, 
                                          fish_type, batch_id, created_at)
                SELECT ?, ?, current_count, average_weight, fish_type, 
                       CONCAT(?, '_', batch_id), NOW()
                FROM fish_inventory 
                WHERE system_id = ? AND fish_tank_id = ?
            `, [newSystemId, newTankId, newSystemId, ORIBI_1_SYSTEM_ID, originalTankId]);
        }
        
            // Commit transaction
            console.log('Committing transaction...');
            await connection.execute('COMMIT');
            console.log('Transaction committed successfully');
            
            // Query for the created system using the SAME connection
            console.log('Querying for created system...');
            const [createdSystemRows] = await connection.execute(
                'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
                [newSystemId, targetUserId]
            );
            
            console.log('Demo system creation debug:');
            console.log('- New system ID:', newSystemId);
            console.log('- Target user ID:', targetUserId);
            console.log('- Query result rows count:', createdSystemRows.length);
            console.log('- Created system object:', createdSystemRows[0]);
            
            if (createdSystemRows.length === 0) {
                console.error('CRITICAL: System not found after creation');
                console.error('This indicates a transaction rollback or constraint violation');
                return res.status(500).json({ 
                    error: 'System creation failed - transaction may have been rolled back',
                    system_id: newSystemId,
                    user_id: targetUserId
                });
            }
            
            const createdSystem = createdSystemRows[0];
            
            const response = {
                ...createdSystem,
                message: 'Demo system created successfully with Oribi 1 reference data'
            };
            
            console.log('Final response object keys:', Object.keys(response));
            console.log('Response has ID:', !!response.id);
            
            res.status(201).json(response);
            
        } catch (transactionError) {
            console.error('Transaction error occurred:', transactionError);
            console.error('Rolling back transaction...');
            await connection.execute('ROLLBACK');
            throw transactionError; // Re-throw to outer catch block
        }
        
    } catch (error) {
        console.error('Failed to create demo system:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage,
            errno: error.errno
        });
        
        // Determine error type for better user feedback
        let errorMessage = 'Failed to create demo system';
        let statusCode = 500;
        
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'System with this name already exists';
            statusCode = 409;
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
            errorMessage = 'Reference data is missing - demo system template may not be available';
            statusCode = 404;
        } else if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            errorMessage = 'Database constraint error during system creation';
            statusCode = 409;
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
            errorMessage = 'Database connection error';
            statusCode = 503;
        }
        
        res.status(statusCode).json({ 
            error: errorMessage,
            details: error.message,
            system_name: system_name || 'unknown',
            error_code: error.code || 'UNKNOWN'
        });
    } finally {
        // Ensure connection is always closed
        if (connection) {
            try {
                await connection.end();
                console.log('Database connection closed');
            } catch (closeError) {
                console.error('Error closing database connection:', closeError);
            }
        }
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