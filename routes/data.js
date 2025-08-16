const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper function to convert empty/undefined values to null for MySQL
function toSqlValue(value) {
    if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
        return null;
    }
    return value;
}

// All routes require authentication
router.use(authenticateToken);

// Get latest data for preloading forms
router.get('/latest/:systemId', async (req, res) => {
    const { systemId } = req.params;
    
    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        const latestData = {};
        
        // Get latest water quality data from nutrient_readings
        const waterQualityParams = ['ph', 'ec', 'dissolved_oxygen', 'temperature', 'ammonia', 'humidity', 'salinity'];
        const [latestWaterQuality] = await pool.execute(`SELECT * FROM nutrient_readings 
                WHERE system_id = ? 
                AND nutrient_type IN (${waterQualityParams.map(() => '?').join(',')})
                ORDER BY reading_date DESC LIMIT 10`, 
            [systemId, ...waterQualityParams]);
        
        // Get latest plant growth data
        const [plantGrowthRows] = await pool.execute('SELECT * FROM plant_growth WHERE system_id = ? ORDER BY created_at DESC LIMIT 1', 
            [systemId]);
        const latestPlantGrowth = plantGrowthRows[0] || null;
        
        // Get latest fish health data
        const [fishHealthRows] = await pool.execute('SELECT * FROM fish_health WHERE system_id = ? ORDER BY created_at DESC LIMIT 1', 
            [systemId]);
        const latestFishHealth = fishHealthRows[0] || null;

        latestData.waterQuality = latestWaterQuality;
        latestData.plantGrowth = latestPlantGrowth;
        latestData.fishHealth = latestFishHealth;        res.json(latestData);
    } catch (error) {
        console.error('Error fetching latest data:', error);
        res.status(500).json({ error: 'Failed to fetch latest data' });
    }
});

// Helper function to verify system ownership
async function verifySystemOwnership(systemId, userId) {
    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute('SELECT id FROM systems WHERE id = ? AND user_id = ?', 
            [systemId, userId]);        return rows.length > 0;
    } catch (error) {
        throw error;
    }
}

// Water Quality Data - Now fetches from nutrient_readings table
router.get('/water-quality/:systemId', async (req, res) => {
    const { systemId } = req.params;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        // Get all unique dates from nutrient_readings for water quality parameters
        const waterQualityParams = ['ph', 'ec', 'dissolved_oxygen', 'temperature', 'ammonia', 'humidity', 'salinity'];
        
        // Get all readings for water quality parameters
        const [rows] = await pool.execute(`
            SELECT reading_date, nutrient_type, value, source, created_at
            FROM nutrient_readings 
            WHERE system_id = ? 
            AND nutrient_type IN (${waterQualityParams.map(() => '?').join(',')})
            ORDER BY reading_date DESC
        `, [systemId, ...waterQualityParams]);
        
        // Group by date to create water_quality-like records
        const groupedData = {};
        rows.forEach(row => {
            const date = row.reading_date;
            if (!groupedData[date]) {
                groupedData[date] = {
                    system_id: systemId,
                    date: date,
                    created_at: row.created_at,
                    ph: null,
                    ec: null,
                    dissolved_oxygen: null,
                    temperature: null,
                    ammonia: null,
                    humidity: null,
                    salinity: null
                };
            }
            // Map nutrient_type to the old column name
            groupedData[date][row.nutrient_type] = row.value;
        });
        
        // Convert to array and sort by date
        const result = Object.values(groupedData).sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );        res.json(result);
    } catch (error) {
        console.error('Error fetching water quality data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

router.post('/water-quality/:systemId', async (req, res) => {
    const { systemId } = req.params;
    const { date, ph, ec, dissolved_oxygen, temperature, humidity, salinity, ammonia, notes, nutrients, 
            nitrite, nitrate, iron, potassium, calcium, phosphorus, magnesium } = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        // Save all water quality parameters to nutrient_readings table
        const parameters = [
            { type: 'ph', value: ph, unit: '' },
            { type: 'ec', value: ec, unit: 'μS/cm' },
            { type: 'dissolved_oxygen', value: dissolved_oxygen, unit: 'mg/L' },
            { type: 'temperature', value: temperature, unit: '°C' },
            { type: 'ammonia', value: ammonia, unit: 'ppm' },
            { type: 'humidity', value: humidity, unit: '%' },
            { type: 'salinity', value: salinity, unit: 'ppt' },
            // Add nutrient parameters from form
            { type: 'nitrite', value: nitrite, unit: 'mg/L' },
            { type: 'nitrate', value: nitrate, unit: 'mg/L' },
            { type: 'iron', value: iron, unit: 'mg/L' },
            { type: 'potassium', value: potassium, unit: 'mg/L' },
            { type: 'calcium', value: calcium, unit: 'mg/L' },
            { type: 'phosphorus', value: phosphorus, unit: 'mg/L' },
            { type: 'magnesium', value: magnesium, unit: 'mg/L' }
        ];

        const insertedIds = [];
        const readingDate = (date || new Date().toISOString()).replace('T', ' ').slice(0, 19);

        // Insert each parameter that has a value
        for (const param of parameters) {
            if (param.value !== null && param.value !== undefined && param.value !== '' && !isNaN(param.value)) {
                const [result] = await pool.execute(`INSERT INTO nutrient_readings 
                    (system_id, nutrient_type, value, unit, reading_date, source, notes) 
                    VALUES (?, ?, ?, ?, ?, 'manual', ?)`, 
                    [systemId, param.type, param.value, param.unit, readingDate, notes || '']);
                insertedIds.push(result.insertId);
            }
        }

        // Save additional nutrient readings if provided
        if (nutrients && Array.isArray(nutrients)) {
            for (const nutrient of nutrients) {
                if (nutrient.type && nutrient.value !== null && nutrient.value !== undefined && nutrient.value !== '' && !isNaN(nutrient.value)) {
                    const [result] = await pool.execute(`INSERT INTO nutrient_readings 
                        (system_id, nutrient_type, value, unit, reading_date, source, notes) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                        [systemId, nutrient.type, nutrient.value, nutrient.unit || 'mg/L', readingDate, nutrient.source || 'manual', nutrient.notes || '']);
                    insertedIds.push(result.insertId);
                }
            }
        }        res.status(201).json({ ids: insertedIds, message: 'Water quality data saved to nutrient_readings' });
    } catch (error) {
        console.error('Error saving water quality data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Nutrient Readings - GET all nutrient readings for a system
router.get('/nutrients/:systemId', async (req, res) => {
    const { systemId } = req.params;
    const { nutrient_type, limit } = req.query;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        let query = 'SELECT * FROM nutrient_readings WHERE system_id = ?';
        let params = [systemId];

        if (nutrient_type) {
            query += ' AND nutrient_type = ?';
            params.push(nutrient_type);
        }

        query += ' ORDER BY reading_date DESC';

        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        const [data] = await pool.execute(query, params);        res.json(data);
    } catch (error) {
        console.error('Error fetching nutrient data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Nutrient Readings - POST single or multiple nutrient readings
router.post('/nutrients/:systemId', async (req, res) => {
    const { systemId } = req.params;
    const { nutrients } = req.body; // Array of {type, value, unit, reading_date, source, notes}

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    if (!nutrients || !Array.isArray(nutrients)) {
        return res.status(400).json({ error: 'nutrients array is required' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        const insertedIds = [];
        
        for (const nutrient of nutrients) {
            if (!nutrient.type || nutrient.value === null || nutrient.value === undefined || nutrient.value === '' || isNaN(nutrient.value)) {
                continue; // Skip invalid entries
            }

            const [result] = await pool.execute(`INSERT INTO nutrient_readings 
                (system_id, nutrient_type, value, unit, reading_date, source, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                [
                    systemId, 
                    nutrient.type, 
                    parseFloat(nutrient.value), 
                    nutrient.unit || 'mg/L', 
                    (nutrient.reading_date || new Date().toISOString()).replace('T', ' ').slice(0, 19), 
                    nutrient.source || 'manual', 
                    nutrient.notes || ''
                ]);
            insertedIds.push(result.insertId);
        }        res.status(201).json({ 
            ids: insertedIds, 
            message: `${insertedIds.length} nutrient readings saved` 
        });
    } catch (error) {
        console.error('Error saving nutrient data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Get latest nutrient values for dashboard (aggregated by type)
router.get('/nutrients/latest/:systemId', async (req, res) => {
    const { systemId } = req.params;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        // Get the most recent reading for each nutrient type
        const [data] = await pool.execute(`
            SELECT 
                nr1.nutrient_type,
                nr1.value,
                nr1.unit,
                nr1.reading_date,
                nr1.source
            FROM nutrient_readings nr1
            INNER JOIN (
                SELECT nutrient_type, MAX(reading_date) as max_date
                FROM nutrient_readings 
                WHERE system_id = ?
                GROUP BY nutrient_type
            ) nr2 ON nr1.nutrient_type = nr2.nutrient_type AND nr1.reading_date = nr2.max_date
            WHERE nr1.system_id = ?
            ORDER BY nr1.nutrient_type
        `, [systemId, systemId]);
        
        // Convert to object format for easier frontend consumption
        const nutrients = {};
        data.forEach(row => {
            nutrients[row.nutrient_type] = {
                value: row.value,
                unit: row.unit,
                reading_date: row.reading_date,
                source: row.source
            };
        });        res.json(nutrients);
    } catch (error) {
        console.error('Error fetching latest nutrient data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Fish Health Data
router.get('/fish-health/:systemId', async (req, res) => {
    const { systemId } = req.params;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        const [data] = await pool.execute(`
            SELECT fh.*, ft.tank_number 
            FROM fish_health fh 
            LEFT JOIN fish_tanks ft ON fh.fish_tank_id = ft.id 
            WHERE fh.system_id = ? 
            ORDER BY fh.date DESC, fh.created_at DESC
        `, [systemId]);        res.json(data);
    } catch (error) {
        console.error('Error fetching fish health data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

router.post('/fish-health/:systemId', async (req, res) => {
    const { systemId } = req.params;
    const { date, fish_tank_id, count, mortality, average_weight, feed_consumption, feed_type, behavior, notes } = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        
        // Map tank_number to actual tank ID
        const [tankRows] = await pool.execute(
            'SELECT id FROM fish_tanks WHERE system_id = ? AND (id = ? OR tank_number = ?)',
            [systemId, fish_tank_id || 1, fish_tank_id || 1]
        );
        
        const actualTankId = tankRows && tankRows.length > 0 ? tankRows[0].id : fish_tank_id || 1;
        
        const [result] = await pool.execute(`INSERT INTO fish_health 
            (system_id, fish_tank_id, date, count, mortality, average_weight, feed_consumption, feed_type, behavior, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [toSqlValue(systemId), toSqlValue(actualTankId), toSqlValue(date), toSqlValue(count), toSqlValue(mortality), toSqlValue(average_weight), toSqlValue(feed_consumption), toSqlValue(feed_type), toSqlValue(behavior), toSqlValue(notes)]);        res.status(201).json({ id: result.insertId, message: 'Fish health data saved' });
    } catch (error) {
        console.error('Error saving fish health data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Plant Growth Data
router.get('/plant-growth/:systemId', async (req, res) => {
    const { systemId } = req.params;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        const [data] = await pool.execute('SELECT * FROM plant_growth WHERE system_id = ? ORDER BY date DESC', 
            [systemId]);        res.json(data);
    } catch (error) {
        console.error('Error fetching plant growth data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

router.post('/plant-growth/:systemId', async (req, res) => {
    const { systemId } = req.params;
    const { date, grow_bed_id, crop_type, count, harvest_weight, plants_harvested, new_seedlings, pest_control, health, growth_stage, notes, batch_id, seed_variety, batch_created_date, days_to_harvest } = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        const [result] = await pool.execute(`INSERT INTO plant_growth 
            (system_id, grow_bed_id, date, crop_type, count, harvest_weight, plants_harvested, new_seedlings, pest_control, health, growth_stage, notes, batch_id, seed_variety, batch_created_date, days_to_harvest) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [systemId, grow_bed_id, date, crop_type, count || null, harvest_weight || null, plants_harvested || null, new_seedlings || null, pest_control || null, health || null, growth_stage || null, notes || null, batch_id || null, seed_variety || null, batch_created_date || null, days_to_harvest || null]);        res.status(201).json({ id: result.insertId, message: 'Plant growth data saved' });
    } catch (error) {
        console.error('Error saving plant growth data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Delete plant growth record
router.delete('/plant-growth/:systemId/:recordId', async (req, res) => {
    const { systemId, recordId } = req.params;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        const [result] = await pool.execute('DELETE FROM plant_growth WHERE id = ? AND system_id = ?', 
            [recordId, systemId]);        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Plant growth record not found' });
        }
        
        res.json({ message: 'Plant growth record deleted successfully' });
    } catch (error) {
        console.error('Error deleting plant growth record:', error);
        res.status(500).json({ error: 'Failed to delete record' });
    }
});

// Update plant growth record
router.put('/plant-growth/:entryId', async (req, res) => {
    const { entryId } = req.params;
    const { date, grow_bed_id, crop_type, count, harvest_weight, plants_harvested, new_seedlings, pest_control, health, growth_stage, notes } = req.body;

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        // First verify the entry belongs to a system owned by the user
        const [entryRows] = await pool.execute('SELECT system_id FROM plant_growth WHERE id = ?', [entryId]);
        const entry = entryRows[0];

        if (!entry) {            return res.status(404).json({ error: 'Plant growth record not found' });
        }

        if (!await verifySystemOwnership(entry.system_id, req.user.userId)) {            return res.status(403).json({ error: 'Access denied to this system' });
        }

        // Update the record
        const [result] = await pool.execute(`UPDATE plant_growth SET 
            date = ?, grow_bed_id = ?, crop_type = ?, count = ?, harvest_weight = ?, 
            plants_harvested = ?, new_seedlings = ?, pest_control = ?, health = ?, 
            growth_stage = ?, notes = ?
            WHERE id = ?`, 
            [date, grow_bed_id, crop_type, count || null, harvest_weight || null, plants_harvested || null, 
             new_seedlings || null, pest_control || null, health || null, growth_stage || null, notes || null, entryId]);        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Plant growth record not found' });
        }
        
        res.json({ message: 'Plant growth record updated successfully' });
    } catch (error) {
        console.error('Error updating plant growth record:', error);
        res.status(500).json({ error: 'Failed to update record' });
    }
});

// Operations Data
router.get('/operations/:systemId', async (req, res) => {
    const { systemId } = req.params;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        const [data] = await pool.execute('SELECT * FROM operations WHERE system_id = ? ORDER BY date DESC', 
            [systemId]);        res.json(data);
    } catch (error) {
        console.error('Error fetching operations data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

router.post('/operations/:systemId', async (req, res) => {
    const { systemId } = req.params;
    const { date, operation_type, water_volume, chemical_added, amount_added, downtime_duration, notes } = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        const [result] = await pool.execute(`INSERT INTO operations 
            (system_id, date, operation_type, water_volume, chemical_added, amount_added, downtime_duration, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [systemId, date, operation_type, water_volume, chemical_added, amount_added, downtime_duration, notes]);        res.status(201).json({ id: result.insertId, message: 'Operations data saved' });
    } catch (error) {
        console.error('Error saving operations data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// New data-entries endpoints for frontend compatibility
// These wrap the existing data endpoints but accept different parameter formats

// Fish Health - GET with query parameter
router.get('/entries/fish-health', async (req, res) => {
    const { system_id, limit } = req.query;
    
    if (!system_id) {
        return res.status(400).json({ error: 'system_id query parameter is required' });
    }

    if (!await verifySystemOwnership(system_id, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        let query = `
            SELECT fh.*, ft.tank_number 
            FROM fish_health fh 
            LEFT JOIN fish_tanks ft ON fh.fish_tank_id = ft.id 
            WHERE fh.system_id = ? 
            ORDER BY fh.date DESC, fh.created_at DESC
        `;
        const params = [system_id];
        
        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit, 10));
        }
        
        const [data] = await pool.execute(query, params);        res.json(data);
    } catch (error) {
        console.error('Error fetching fish health data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Fish Health - POST with system_id in body
router.post('/entries/fish-health', async (req, res) => {
    const { system_id, date, fish_tank_id, count, mortality, average_weight, feed_consumption, feed_type, behavior, notes } = req.body;
    
    if (!system_id) {
        return res.status(400).json({ error: 'system_id is required in request body' });
    }

    if (!await verifySystemOwnership(system_id, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        
        // Map tank_number to actual tank ID
        const [tankRows] = await pool.execute(
            'SELECT id FROM fish_tanks WHERE system_id = ? AND (id = ? OR tank_number = ?)',
            [system_id, fish_tank_id || 1, fish_tank_id || 1]
        );
        
        const actualTankId = tankRows && tankRows.length > 0 ? tankRows[0].id : fish_tank_id || 1;
        
        const [result] = await pool.execute(`INSERT INTO fish_health 
            (system_id, fish_tank_id, date, count, mortality, average_weight, feed_consumption, feed_type, behavior, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [toSqlValue(system_id), toSqlValue(actualTankId), toSqlValue(date), toSqlValue(count), toSqlValue(mortality), toSqlValue(average_weight), toSqlValue(feed_consumption), toSqlValue(feed_type), toSqlValue(behavior), toSqlValue(notes)]);        res.status(201).json({ id: result.insertId, message: 'Fish health data saved' });
    } catch (error) {
        console.error('Error saving fish health data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Water Quality - GET with query parameter (fetches from nutrient_readings)
router.get('/entries/water-quality', async (req, res) => {
    const { system_id, limit } = req.query;
    
    if (!system_id) {
        return res.status(400).json({ error: 'system_id query parameter is required' });
    }

    if (!await verifySystemOwnership(system_id, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        // Get water quality parameters from nutrient_readings
        const waterQualityParams = ['ph', 'ec', 'dissolved_oxygen', 'temperature', 'ammonia', 'humidity', 'salinity'];
        
        let query = `
            SELECT reading_date as date, nutrient_type, value, unit, source, notes, created_at
            FROM nutrient_readings 
            WHERE system_id = ? 
            AND nutrient_type IN (${waterQualityParams.map(() => '?').join(',')})
            ORDER BY reading_date DESC
        `;
        
        const params = [system_id, ...waterQualityParams];
        
        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit, 10));
        }
        
        const [data] = await pool.execute(query, params);        res.json(data);
    } catch (error) {
        console.error('Error fetching water quality data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Water Quality - POST with system_id in body
router.post('/entries/water-quality', async (req, res) => {
    const { system_id, date, ph, ec, dissolved_oxygen, temperature, ammonia, notes, nutrients } = req.body;
    
    if (!system_id) {
        return res.status(400).json({ error: 'system_id is required in request body' });
    }

    if (!await verifySystemOwnership(system_id, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        let insertedReadings = [];

        // Save basic water quality parameters to nutrient_readings table
        const waterQualityParams = [
            { type: 'ph', value: ph, unit: '' },
            { type: 'ec', value: ec, unit: 'μS/cm' },
            { type: 'dissolved_oxygen', value: dissolved_oxygen, unit: 'mg/L' },
            { type: 'temperature', value: temperature, unit: '°C' },
            { type: 'ammonia', value: ammonia, unit: 'ppm' }
        ];

        for (const param of waterQualityParams) {
            if (param.value !== null && param.value !== undefined && param.value !== '') {
                const [result] = await pool.execute(`INSERT INTO nutrient_readings 
                    (system_id, nutrient_type, value, unit, reading_date, source, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                    [system_id, param.type, param.value, param.unit, (date || new Date().toISOString()).replace('T', ' ').slice(0, 19), 'manual', notes || '']);
                insertedReadings.push(result.insertId);
            }
        }

        // Handle legacy nutrient data (for backward compatibility)
        const { nitrite, nitrate, iron, potassium, calcium } = req.body;
        if (nitrite || nitrate || iron || potassium || calcium) {
            const legacyNutrients = [];
            if (nitrite) legacyNutrients.push({ type: 'nitrite', value: nitrite });
            if (nitrate) legacyNutrients.push({ type: 'nitrate', value: nitrate });
            if (iron) legacyNutrients.push({ type: 'iron', value: iron });
            if (potassium) legacyNutrients.push({ type: 'potassium', value: potassium });
            if (calcium) legacyNutrients.push({ type: 'calcium', value: calcium });

            for (const nutrient of legacyNutrients) {
                const [result] = await pool.execute(`INSERT INTO nutrient_readings 
                    (system_id, nutrient_type, value, unit, reading_date, source, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                    [system_id, nutrient.type, nutrient.value, 'mg/L', (date || new Date().toISOString()).replace('T', ' ').slice(0, 19), 'manual', notes || '']);
                insertedReadings.push(result.insertId);
            }
        }

        // Save individual nutrient readings if provided
        if (nutrients && Array.isArray(nutrients)) {
            for (const nutrient of nutrients) {
                if (nutrient.type && nutrient.value !== null && nutrient.value !== undefined) {
                    const [result] = await pool.execute(`INSERT INTO nutrient_readings 
                        (system_id, nutrient_type, value, unit, reading_date, source, notes) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                        [system_id, nutrient.type, nutrient.value, nutrient.unit || 'mg/L', (date || new Date().toISOString()).replace('T', ' ').slice(0, 19), nutrient.source || 'manual', nutrient.notes || notes || '']);
                    insertedReadings.push(result.insertId);
                }
            }
        }        res.status(201).json({ ids: insertedReadings, message: 'Water quality and nutrient data saved to nutrient_readings table' });
    } catch (error) {
        console.error('Error saving water quality data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Delete fish health entry
router.delete('/fish-health/entry/:entryId', async (req, res) => {
    const { entryId } = req.params;
    
    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        
        // First verify the entry exists and belongs to a system owned by the user
        const [entryRows] = await pool.execute('SELECT system_id FROM fish_health WHERE id = ?', [entryId]);
        
        if (entryRows.length === 0) {            return res.status(404).json({ error: 'Entry not found' });
        }
        
        const entry = entryRows[0];
        if (!await verifySystemOwnership(entry.system_id, req.user.userId)) {            return res.status(403).json({ error: 'Access denied to this system' });
        }
        
        // Delete the entry
        const [result] = await pool.execute('DELETE FROM fish_health WHERE id = ?', [entryId]);        res.json({ message: 'Entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting fish health entry:', error);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

// Update fish health entry
router.put('/fish-health/entry/:entryId', async (req, res) => {
    const { entryId } = req.params;
    const { feed_consumption, feed_type, mortality, behavior, notes } = req.body;
    
    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        
        // First verify the entry exists and belongs to a system owned by the user
        const [entryRows] = await pool.execute('SELECT system_id FROM fish_health WHERE id = ?', [entryId]);
        
        if (entryRows.length === 0) {            return res.status(404).json({ error: 'Entry not found' });
        }
        
        const entry = entryRows[0];
        if (!await verifySystemOwnership(entry.system_id, req.user.userId)) {            return res.status(403).json({ error: 'Access denied to this system' });
        }
        
        // Update the entry
        const [result] = await pool.execute(`
            UPDATE fish_health 
            SET feed_consumption = ?, feed_type = ?, mortality = ?, behavior = ?, notes = ?
            WHERE id = ?
        `, [toSqlValue(feed_consumption), toSqlValue(feed_type), toSqlValue(mortality), toSqlValue(behavior), toSqlValue(notes), entryId]);        res.json({ message: 'Entry updated successfully' });
    } catch (error) {
        console.error('Error updating fish health entry:', error);
        res.status(500).json({ error: 'Failed to update entry' });
    }
});

// Update grow bed for all records in a batch
router.put('/batch/:systemId/:batchId/grow-bed', async (req, res) => {
    const { systemId, batchId } = req.params;
    const { newGrowBedId } = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    if (!newGrowBedId) {
        return res.status(400).json({ error: 'newGrowBedId is required' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        const [result] = await pool.execute('UPDATE plant_growth SET grow_bed_id = ? WHERE batch_id = ? AND system_id = ?', 
            [newGrowBedId, batchId, systemId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No records found for batch' });
        }

        res.json({ 
            message: `Updated ${result.affectedRows} records for batch ${batchId}`,
            changes: result.affectedRows 
        });
    } catch (error) {
        console.error('Error updating batch grow bed:', error);
        res.status(500).json({ error: 'Failed to update batch grow bed' });
    }
});

module.exports = router;