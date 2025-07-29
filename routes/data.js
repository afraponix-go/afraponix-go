const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get latest data for preloading forms
router.get('/latest/:systemId', async (req, res) => {
    const { systemId } = req.params;
    
    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    const db = getDatabase();
    try {
        const latestData = {};
        
        // Get latest water quality data
        const latestWaterQuality = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM water_quality WHERE system_id = ? ORDER BY created_at DESC LIMIT 1', 
                [systemId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        // Get latest plant growth data
        const latestPlantGrowth = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM plant_growth WHERE system_id = ? ORDER BY created_at DESC LIMIT 1', 
                [systemId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        // Get latest fish health data
        const latestFishHealth = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM fish_health WHERE system_id = ? ORDER BY created_at DESC LIMIT 1', 
                [systemId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        latestData.waterQuality = latestWaterQuality;
        latestData.plantGrowth = latestPlantGrowth;
        latestData.fishHealth = latestFishHealth;

        db.close();
        res.json(latestData);
    } catch (error) {
        db.close();
        console.error('Error fetching latest data:', error);
        res.status(500).json({ error: 'Failed to fetch latest data' });
    }
});

// Helper function to verify system ownership
async function verifySystemOwnership(systemId, userId) {
    const db = getDatabase();
    return new Promise((resolve, reject) => {
        db.get('SELECT id FROM systems WHERE id = ? AND user_id = ?', 
            [systemId, userId], (err, row) => {
            db.close();
            if (err) reject(err);
            else resolve(!!row);
        });
    });
}

// Water Quality Data
router.get('/water-quality/:systemId', async (req, res) => {
    const { systemId } = req.params;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    const db = getDatabase();
    try {
        const data = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM water_quality WHERE system_id = ? ORDER BY date DESC', 
                [systemId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        db.close();
        res.json(data);
    } catch (error) {
        db.close();
        console.error('Error fetching water quality data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

router.post('/water-quality/:systemId', async (req, res) => {
    const { systemId } = req.params;
    const { date, ph, ec, dissolved_oxygen, temperature, ammonia, nitrite, nitrate, iron, potassium, calcium, notes } = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    const db = getDatabase();
    try {
        const result = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO water_quality 
                (system_id, date, ph, ec, dissolved_oxygen, temperature, ammonia, nitrite, nitrate, iron, potassium, calcium, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [systemId, date, ph, ec, dissolved_oxygen, temperature, ammonia, nitrite, nitrate, iron, potassium, calcium, notes], 
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
        db.close();
        res.status(201).json({ id: result.id, message: 'Water quality data saved' });
    } catch (error) {
        db.close();
        console.error('Error saving water quality data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Fish Health Data
router.get('/fish-health/:systemId', async (req, res) => {
    const { systemId } = req.params;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    const db = getDatabase();
    try {
        const data = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM fish_health WHERE system_id = ? ORDER BY date DESC', 
                [systemId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        db.close();
        res.json(data);
    } catch (error) {
        db.close();
        console.error('Error fetching fish health data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

router.post('/fish-health/:systemId', async (req, res) => {
    const { systemId } = req.params;
    const { date, fish_tank_id, count, mortality, average_weight, feed_consumption, behavior, notes } = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    const db = getDatabase();
    try {
        const result = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO fish_health 
                (system_id, fish_tank_id, date, count, mortality, average_weight, feed_consumption, behavior, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [systemId, fish_tank_id || 1, date, count, mortality, average_weight, feed_consumption, behavior, notes], 
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
        db.close();
        res.status(201).json({ id: result.id, message: 'Fish health data saved' });
    } catch (error) {
        db.close();
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

    const db = getDatabase();
    try {
        const data = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM plant_growth WHERE system_id = ? ORDER BY date DESC', 
                [systemId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        db.close();
        res.json(data);
    } catch (error) {
        db.close();
        console.error('Error fetching plant growth data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

router.post('/plant-growth/:systemId', async (req, res) => {
    const { systemId } = req.params;
    const { date, crop_type, count, harvest_weight, plants_harvested, new_seedlings, pest_control, health, growth_stage, notes } = req.body;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    const db = getDatabase();
    try {
        const result = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO plant_growth 
                (system_id, date, crop_type, count, harvest_weight, plants_harvested, new_seedlings, pest_control, health, growth_stage, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [systemId, date, crop_type, count, harvest_weight, plants_harvested, new_seedlings, pest_control, health, growth_stage, notes], 
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
        db.close();
        res.status(201).json({ id: result.id, message: 'Plant growth data saved' });
    } catch (error) {
        db.close();
        console.error('Error saving plant growth data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Operations Data
router.get('/operations/:systemId', async (req, res) => {
    const { systemId } = req.params;

    if (!await verifySystemOwnership(systemId, req.user.userId)) {
        return res.status(403).json({ error: 'Access denied to this system' });
    }

    const db = getDatabase();
    try {
        const data = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM operations WHERE system_id = ? ORDER BY date DESC', 
                [systemId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        db.close();
        res.json(data);
    } catch (error) {
        db.close();
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

    const db = getDatabase();
    try {
        const result = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO operations 
                (system_id, date, operation_type, water_volume, chemical_added, amount_added, downtime_duration, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                [systemId, date, operation_type, water_volume, chemical_added, amount_added, downtime_duration, notes], 
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
        db.close();
        res.status(201).json({ id: result.id, message: 'Operations data saved' });
    } catch (error) {
        db.close();
        console.error('Error saving operations data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

module.exports = router;