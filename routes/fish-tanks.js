const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create or update fish tank
router.post('/', async (req, res) => {
    console.log('Fish tank POST request received:', req.body);
    const { system_id, tank_number, size_m3, volume_liters, fish_type } = req.body;

    // Input validation
    if (!system_id || tank_number === undefined || !size_m3 || !volume_liters || !fish_type) {
        return res.status(400).json({ 
            error: 'System ID, tank number, size_m3, volume_liters, and fish_type are required' 
        });
    }

    // Validate numeric inputs
    if (typeof tank_number !== 'number' || tank_number < 1) {
        return res.status(400).json({ error: 'Tank number must be a positive integer' });
    }

    if (typeof size_m3 !== 'number' || size_m3 <= 0) {
        return res.status(400).json({ error: 'Size in m3 must be a positive number' });
    }

    if (typeof volume_liters !== 'number' || volume_liters <= 0) {
        return res.status(400).json({ error: 'Volume in liters must be a positive number' });
    }

    // Validate fish type
    const validFishTypes = ['tilapia', 'catfish', 'trout', 'salmon', 'bass', 'other'];
    if (!validFishTypes.includes(fish_type.toLowerCase())) {
        return res.status(400).json({ 
            error: `Fish type must be one of: ${validFishTypes.join(', ')}` 
        });
    }

    const db = getDatabase();

    try {
        console.log(`Verifying system ${system_id} for user ${req.user.userId}`);
        // First verify the system exists and belongs to the user
        const system = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM systems WHERE id = ? AND user_id = ?', 
                [system_id, req.user.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!system) {
            console.log(`System ${system_id} not found or access denied for user ${req.user.userId}`);
            db.close();
            return res.status(404).json({ error: 'System not found or access denied' });
        }
        console.log(`System ${system_id} verified successfully`);

        // Check if tank with this number already exists for this system
        console.log(`Checking for existing tank ${tank_number} in system ${system_id}`);
        const existingTank = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM fish_tanks WHERE system_id = ? AND tank_number = ?', 
                [system_id, tank_number], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        console.log(`Existing tank found:`, existingTank ? 'Yes' : 'No');

        let result;
        if (existingTank) {
            // Update existing tank
            console.log(`Updating existing tank ${tank_number}`);
            result = await new Promise((resolve, reject) => {
                db.run(`UPDATE fish_tanks SET 
                    size_m3 = ?, volume_liters = ?, fish_type = ?
                    WHERE system_id = ? AND tank_number = ?`, 
                    [size_m3, volume_liters, fish_type.toLowerCase(), system_id, tank_number], 
                    function(err) {
                        if (err) reject(err);
                        else resolve({ id: existingTank.id, changes: this.changes });
                    }
                );
            });
            console.log(`Update result:`, result);
        } else {
            // Create new tank
            console.log(`Creating new tank ${tank_number}`);
            result = await new Promise((resolve, reject) => {
                db.run(`INSERT INTO fish_tanks 
                    (system_id, tank_number, size_m3, volume_liters, fish_type) 
                    VALUES (?, ?, ?, ?, ?)`, 
                    [system_id, tank_number, size_m3, volume_liters, fish_type.toLowerCase()], 
                    function(err) {
                        if (err) reject(err);
                        else resolve({ id: this.lastID });
                    }
                );
            });
            console.log(`Insert result:`, result);
        }

        // Get the created/updated tank
        console.log(`Fetching final tank data for tank ${tank_number}`);
        const tank = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM fish_tanks WHERE system_id = ? AND tank_number = ?', 
                [system_id, tank_number], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        console.log(`Final tank data:`, tank);

        db.close();
        
        const statusCode = existingTank ? 200 : 201;
        const message = existingTank ? 'Fish tank updated successfully' : 'Fish tank created successfully';
        
        console.log(`Sending response: ${statusCode} - ${message}`);
        res.status(statusCode).json({
            message,
            tank
        });

    } catch (error) {
        db.close();
        console.error('Error creating/updating fish tank:', error);
        
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'A tank with this number already exists for this system' });
        } else if (error.code === 'SQLITE_CONSTRAINT_FOREIGN') {
            res.status(400).json({ error: 'Invalid system ID' });
        } else {
            res.status(500).json({ error: 'Failed to create/update fish tank' });
        }
    }
});

// Get all fish tanks for a system
router.get('/system/:systemId', async (req, res) => {
    const { systemId } = req.params;

    if (!systemId) {
        return res.status(400).json({ error: 'System ID is required' });
    }

    const db = getDatabase();

    try {
        // First verify the system exists and belongs to the user
        const system = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM systems WHERE id = ? AND user_id = ?', 
                [systemId, req.user.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!system) {
            db.close();
            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Get all tanks for this system
        const tanks = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM fish_tanks WHERE system_id = ? ORDER BY tank_number ASC', 
                [systemId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        db.close();
        res.json({
            system_id: systemId,
            tanks: tanks || []
        });

    } catch (error) {
        db.close();
        console.error('Error fetching fish tanks:', error);
        res.status(500).json({ error: 'Failed to fetch fish tanks' });
    }
});

// Delete specific fish tank
router.delete('/system/:systemId/tank/:tankNumber', async (req, res) => {
    const { systemId, tankNumber } = req.params;

    if (!systemId || !tankNumber) {
        return res.status(400).json({ error: 'System ID and tank number are required' });
    }

    const tankNum = parseInt(tankNumber);
    if (isNaN(tankNum) || tankNum < 1) {
        return res.status(400).json({ error: 'Tank number must be a positive integer' });
    }

    const db = getDatabase();

    try {
        // First verify the system exists and belongs to the user
        const system = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM systems WHERE id = ? AND user_id = ?', 
                [systemId, req.user.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!system) {
            db.close();
            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Check if the tank exists
        const tank = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM fish_tanks WHERE system_id = ? AND tank_number = ?', 
                [systemId, tankNum], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!tank) {
            db.close();
            return res.status(404).json({ error: 'Fish tank not found' });
        }

        // Delete the tank
        const result = await new Promise((resolve, reject) => {
            db.run('DELETE FROM fish_tanks WHERE system_id = ? AND tank_number = ?', 
                [systemId, tankNum], 
                function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                }
            );
        });

        db.close();

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Fish tank not found' });
        }

        res.json({ 
            message: 'Fish tank deleted successfully',
            deleted_tank: {
                system_id: systemId,
                tank_number: tankNum
            }
        });

    } catch (error) {
        db.close();
        console.error('Error deleting fish tank:', error);
        res.status(500).json({ error: 'Failed to delete fish tank' });
    }
});

// Get specific fish tank
router.get('/system/:systemId/tank/:tankNumber', async (req, res) => {
    const { systemId, tankNumber } = req.params;

    if (!systemId || !tankNumber) {
        return res.status(400).json({ error: 'System ID and tank number are required' });
    }

    const tankNum = parseInt(tankNumber);
    if (isNaN(tankNum) || tankNum < 1) {
        return res.status(400).json({ error: 'Tank number must be a positive integer' });
    }

    const db = getDatabase();

    try {
        // First verify the system exists and belongs to the user
        const system = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM systems WHERE id = ? AND user_id = ?', 
                [systemId, req.user.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!system) {
            db.close();
            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Get the specific tank
        const tank = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM fish_tanks WHERE system_id = ? AND tank_number = ?', 
                [systemId, tankNum], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        db.close();

        if (!tank) {
            return res.status(404).json({ error: 'Fish tank not found' });
        }

        res.json(tank);

    } catch (error) {
        db.close();
        console.error('Error fetching fish tank:', error);
        res.status(500).json({ error: 'Failed to fetch fish tank' });
    }
});

module.exports = router;