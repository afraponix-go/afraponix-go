const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { canAccessSystem } = require('../utils/systemAccess');

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

        // Get latest water quality data from water_quality table (primary source)
        const [waterQualityRows] = await pool.execute(
            'SELECT * FROM water_quality WHERE system_id = ? ORDER BY date DESC, created_at DESC LIMIT 1',
            [systemId]
        );

        // Get latest nutrient readings from nutrient_readings table (for additional nutrients)
        const [nutrientRows] = await pool.execute(`
            SELECT nr1.nutrient_type, nr1.value, nr1.unit, nr1.reading_date, nr1.source
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

        // Get latest plant growth data
        const [plantGrowthRows] = await pool.execute('SELECT * FROM plant_growth WHERE system_id = ? ORDER BY created_at DESC LIMIT 1',
            [systemId]);
        const latestPlantGrowth = plantGrowthRows[0] || null;

        // Get latest fish health data
        const [fishHealthRows] = await pool.execute('SELECT * FROM fish_health WHERE system_id = ? ORDER BY created_at DESC LIMIT 1',
            [systemId]);
        const latestFishHealth = fishHealthRows[0] || null;

        latestData.waterQuality = waterQualityRows[0] || null;
        latestData.nutrients = nutrientRows;
        latestData.plantGrowth = latestPlantGrowth;
        latestData.fishHealth = latestFishHealth;        res.json(latestData);
    } catch (error) {
        console.error('Error fetching latest data:', error);
        res.status(500).json({ error: 'Failed to fetch latest data' });
    }
});

// Helper function to verify system ownership
// Access check that also honours accepted shares. Pass write=true on endpoints
// that modify data so view-only collaborators are rejected.
async function verifySystemOwnership(systemId, userId, write = false) {
    return canAccessSystem(systemId, userId, { write });
}

// Water Quality endpoints - stores complete water quality snapshots
router.get('/water-quality/:systemId', async (req, res) => {
    const { systemId } = req.params;
    const { limit } = req.query;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    try {
        const pool = getDatabase();
        let query = 'SELECT * FROM water_quality WHERE system_id = ? ORDER BY created_at DESC';
        const params = [systemId];

        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        const [data] = await pool.execute(query, params);
        res.json(data);
    } catch (error) {
        console.error('Error fetching water quality data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

router.post('/water-quality/:systemId', async (req, res) => {
    const { systemId } = req.params;
    const data = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId, true)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    try {
        const pool = getDatabase();
        const [result] = await pool.execute(`INSERT INTO water_quality
            (system_id, date, ph, ec, dissolved_oxygen, temperature, ammonia, nitrite, nitrate,
             iron, potassium, calcium, phosphorus, magnesium, humidity, salinity, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                systemId,
                data.date || new Date().toISOString().slice(0, 19).replace('T', ' '),
                toSqlValue(data.ph),
                toSqlValue(data.ec),
                toSqlValue(data.dissolved_oxygen),
                toSqlValue(data.temperature),
                toSqlValue(data.ammonia),
                toSqlValue(data.nitrite),
                toSqlValue(data.nitrate),
                toSqlValue(data.iron),
                toSqlValue(data.potassium),
                toSqlValue(data.calcium),
                toSqlValue(data.phosphorus),
                toSqlValue(data.magnesium),
                toSqlValue(data.humidity),
                toSqlValue(data.salinity),
                data.notes || ''
            ]);

        res.status(201).json({
            id: result.insertId,
            message: 'Water quality data saved successfully'
        });
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

    if (!await verifySystemOwnership(systemId, req.user.userId, true)) {
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

    if (!await verifySystemOwnership(systemId, req.user.userId, true)) {
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

    if (!await verifySystemOwnership(systemId, req.user.userId, true)) {
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

    if (!await verifySystemOwnership(systemId, req.user.userId, true)) {
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

        if (!await verifySystemOwnership(entry.system_id, req.user.userId, true)) {            return res.status(403).json({ error: 'Access denied to this system' });
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

    if (!await verifySystemOwnership(systemId, req.user.userId, true)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    // Using connection pool - no manual connection management
    try {
        const pool = getDatabase();
        const [result] = await pool.execute(`INSERT INTO operations
            (system_id, date, operation_type, water_volume, chemical_added, amount_added, downtime_duration, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [systemId, date, operation_type,
             water_volume ?? null, chemical_added ?? null, amount_added ?? null,
             downtime_duration ?? null, notes ?? null]);
        res.status(201).json({ id: result.insertId, message: 'Operations data saved' });
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

    if (!await verifySystemOwnership(system_id, req.user.userId, true)) {
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

// Legacy water quality endpoints removed - use /nutrients/ endpoints instead

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
        if (!await verifySystemOwnership(entry.system_id, req.user.userId, true)) {            return res.status(403).json({ error: 'Access denied to this system' });
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
        if (!await verifySystemOwnership(entry.system_id, req.user.userId, true)) {            return res.status(403).json({ error: 'Access denied to this system' });
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

    if (!await verifySystemOwnership(systemId, req.user.userId, true)) {
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

// Get latest sensor data for a system
router.get('/sensors/latest/:systemId', async (req, res) => {
    const { systemId } = req.params;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    try {
        const pool = getDatabase();
        
        // Get sensor configurations for this system
        const [sensorRows] = await pool.execute(
            'SELECT * FROM sensor_configs WHERE system_id = ?',
            [systemId]
        );
        
        if (sensorRows.length === 0) {
            return res.json({ sensors: [] });
        }

        // For now, return empty data as we don't have actual sensor readings in this demo
        // In a real implementation, this would fetch from ThingsBoard or sensor database
        const sensorData = sensorRows.map(sensor => ({
            id: sensor.id,
            name: sensor.sensor_name,
            type: sensor.sensor_type,
            lastReading: null,
            timestamp: null,
            status: 'offline'
        }));

        res.json({ sensors: sensorData });
    } catch (error) {
        console.error('Error fetching latest sensor data:', error);
        res.status(500).json({ error: 'Failed to fetch sensor data' });
    }
});

// Bulk import endpoints
router.post('/import/:systemId/fish-health', async (req, res) => {
    const { systemId } = req.params;
    const { records } = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId, true)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'records array is required' });
    }

    try {
        const pool = getDatabase();
        const results = [];
        const errors = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            try {
                // Validate required fields
                if (!record.date) {
                    errors.push({ row: i + 1, error: 'Date is required' });
                    continue;
                }

                // Map tank_number to actual tank ID
                const [tankRows] = await pool.execute(
                    'SELECT id FROM fish_tanks WHERE system_id = ? AND (id = ? OR tank_number = ?)',
                    [systemId, record.fish_tank_id || 1, record.fish_tank_id || 1]
                );
                
                const actualTankId = tankRows && tankRows.length > 0 ? tankRows[0].id : record.fish_tank_id || 1;

                const [result] = await pool.execute(`INSERT INTO fish_health 
                    (system_id, fish_tank_id, date, count, mortality, average_weight, feed_consumption, feed_type, behavior, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [
                        systemId, 
                        actualTankId, 
                        record.date, 
                        toSqlValue(record.count), 
                        toSqlValue(record.mortality), 
                        toSqlValue(record.average_weight), 
                        toSqlValue(record.feed_consumption), 
                        toSqlValue(record.feed_type), 
                        toSqlValue(record.behavior), 
                        toSqlValue(record.notes)
                    ]
                );

                results.push({ row: i + 1, id: result.insertId });
            } catch (error) {
                errors.push({ row: i + 1, error: error.message });
            }
        }

        res.json({ 
            imported: results.length, 
            errors: errors.length,
            results,
            errorDetails: errors
        });
    } catch (error) {
        console.error('Error importing fish health data:', error);
        res.status(500).json({ error: 'Failed to import data' });
    }
});

router.post('/import/:systemId/plant-growth', async (req, res) => {
    const { systemId } = req.params;
    const { records } = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId, true)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'records array is required' });
    }

    try {
        const pool = getDatabase();
        const results = [];
        const errors = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            try {
                // Validate required fields
                if (!record.date || !record.crop_type) {
                    errors.push({ row: i + 1, error: 'Date and crop_type are required' });
                    continue;
                }

                const [result] = await pool.execute(`INSERT INTO plant_growth 
                    (system_id, grow_bed_id, date, crop_type, count, harvest_weight, plants_harvested, new_seedlings, pest_control, health, growth_stage, notes, batch_id, seed_variety, batch_created_date, days_to_harvest) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [
                        systemId, 
                        toSqlValue(record.grow_bed_id), 
                        record.date, 
                        record.crop_type, 
                        toSqlValue(record.count), 
                        toSqlValue(record.harvest_weight), 
                        toSqlValue(record.plants_harvested), 
                        toSqlValue(record.new_seedlings), 
                        toSqlValue(record.pest_control), 
                        toSqlValue(record.health), 
                        toSqlValue(record.growth_stage), 
                        toSqlValue(record.notes), 
                        toSqlValue(record.batch_id), 
                        toSqlValue(record.seed_variety), 
                        toSqlValue(record.batch_created_date), 
                        toSqlValue(record.days_to_harvest)
                    ]
                );

                results.push({ row: i + 1, id: result.insertId });
            } catch (error) {
                errors.push({ row: i + 1, error: error.message });
            }
        }

        res.json({ 
            imported: results.length, 
            errors: errors.length,
            results,
            errorDetails: errors
        });
    } catch (error) {
        console.error('Error importing plant growth data:', error);
        res.status(500).json({ error: 'Failed to import data' });
    }
});

router.post('/import/:systemId/nutrients', async (req, res) => {
    const { systemId } = req.params;
    const { records } = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId, true)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'records array is required' });
    }

    try {
        const pool = getDatabase();
        const results = [];
        const errors = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            try {
                // Validate required fields
                if (!record.date) {
                    errors.push({ row: i + 1, error: 'Date is required' });
                    continue;
                }

                // Transpose the wide format data into individual nutrient readings
                const nutrientMappings = {
                    'nitrite': { type: 'nitrite', unit: 'mg/L' },
                    'nitrate': { type: 'nitrate', unit: 'mg/L' },
                    'phosphorus': { type: 'phosphorus', unit: 'mg/L' },
                    'magnesium': { type: 'magnesium', unit: 'mg/L' },
                    'iron': { type: 'iron', unit: 'mg/L' },
                    'zinc': { type: 'zinc', unit: 'mg/L' },
                    'boron': { type: 'boron', unit: 'mg/L' },
                    'manganese': { type: 'manganese', unit: 'mg/L' },
                    'sulfur': { type: 'sulfur', unit: 'mg/L' },
                    'copper': { type: 'copper', unit: 'mg/L' },
                    'molybdenum': { type: 'molybdenum', unit: 'mg/L' },
                    'chlorine': { type: 'chlorine', unit: 'mg/L' }
                };

                // Insert each nutrient parameter as a separate reading
                for (const [fieldName, mapping] of Object.entries(nutrientMappings)) {
                    const value = record[fieldName];
                    
                    // Skip empty values
                    if (value === null || value === undefined || value === '' || isNaN(value)) {
                        continue;
                    }

                    const [result] = await pool.execute(`INSERT INTO nutrient_readings 
                        (system_id, nutrient_type, value, unit, reading_date, source, notes) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                        [
                            systemId, 
                            mapping.type, 
                            parseFloat(value), 
                            mapping.unit, 
                            record.date, 
                            'import', 
                            'Imported from nutrients spreadsheet'
                        ]
                    );

                    results.push({ row: i + 1, parameter: mapping.type, id: result.insertId });
                }

            } catch (error) {
                errors.push({ row: i + 1, error: error.message });
            }
        }

        res.json({ 
            imported: results.length, 
            errors: errors.length,
            results,
            errorDetails: errors
        });
    } catch (error) {
        console.error('Error importing nutrient data:', error);
        res.status(500).json({ error: 'Failed to import data' });
    }
});

router.post('/import/:systemId/operations', async (req, res) => {
    const { systemId } = req.params;
    const { records } = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId, true)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'records array is required' });
    }

    try {
        const pool = getDatabase();
        const results = [];
        const errors = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            try {
                // Validate required fields
                if (!record.date || !record.operation_type) {
                    errors.push({ row: i + 1, error: 'Date and operation_type are required' });
                    continue;
                }

                const [result] = await pool.execute(`INSERT INTO operations 
                    (system_id, date, operation_type, water_volume, chemical_added, amount_added, downtime_duration, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [
                        systemId, 
                        record.date, 
                        record.operation_type, 
                        toSqlValue(record.water_volume), 
                        toSqlValue(record.chemical_added), 
                        toSqlValue(record.amount_added), 
                        toSqlValue(record.downtime_duration), 
                        toSqlValue(record.notes)
                    ]
                );

                results.push({ row: i + 1, id: result.insertId });
            } catch (error) {
                errors.push({ row: i + 1, error: error.message });
            }
        }

        res.json({ 
            imported: results.length, 
            errors: errors.length,
            results,
            errorDetails: errors
        });
    } catch (error) {
        console.error('Error importing operations data:', error);
        res.status(500).json({ error: 'Failed to import data' });
    }
});

// Water Quality wide format import endpoint
router.post('/import/:systemId/water-quality', async (req, res) => {
    const { systemId } = req.params;
    const { records } = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId, true)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'records array is required' });
    }

    try {
        const pool = getDatabase();
        const results = [];
        const errors = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            try {
                // Validate required fields
                if (!record.date) {
                    errors.push({ row: i + 1, error: 'Date is required' });
                    continue;
                }

                // Transpose the wide format data into individual nutrient readings
                const nutrientMappings = {
                    'ph': { type: 'ph', unit: 'pH' },
                    'salinity': { type: 'salinity', unit: 'ppt' },
                    'nitrogen': { type: 'nitrogen', unit: 'mg/L' },
                    'potassium': { type: 'potassium', unit: 'mg/L' },
                    'calcium': { type: 'calcium', unit: 'mg/L' },
                    'dissolved_oxygen': { type: 'dissolved_oxygen', unit: 'mg/L' },
                    'temperature': { type: 'temperature', unit: '°C' }
                };

                // Insert each nutrient parameter as a separate reading
                for (const [fieldName, mapping] of Object.entries(nutrientMappings)) {
                    const value = record[fieldName];
                    
                    // Skip empty values
                    if (value === null || value === undefined || value === '' || isNaN(value)) {
                        continue;
                    }

                    const [result] = await pool.execute(`INSERT INTO nutrient_readings 
                        (system_id, nutrient_type, value, unit, reading_date, source, notes) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                        [
                            systemId, 
                            mapping.type, 
                            parseFloat(value), 
                            mapping.unit, 
                            record.date, 
                            'import', 
                            'Imported from water quality spreadsheet'
                        ]
                    );

                    results.push({ row: i + 1, parameter: mapping.type, id: result.insertId });
                }

            } catch (error) {
                errors.push({ row: i + 1, error: error.message });
            }
        }

        res.json({ 
            imported: results.length, 
            errors: errors.length,
            results,
            errorDetails: errors
        });
    } catch (error) {
        console.error('Error importing water quality data:', error);
        res.status(500).json({ error: 'Failed to import data' });
    }
});

module.exports = router;