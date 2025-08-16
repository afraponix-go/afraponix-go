const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create or update fish tank
router.post('/', async (req, res) => {
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

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        // First verify the system exists and belongs to the user
        const [systemRows] = await pool.execute('SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [system_id, req.user.userId]);
        const system = systemRows[0];

        if (!system) {
            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Check if tank with this number already exists for this system
        const [existingTankRows] = await pool.execute('SELECT * FROM fish_tanks WHERE system_id = ? AND tank_number = ?', 
            [system_id, tank_number]);
        const existingTank = existingTankRows[0];

        let result;
        if (existingTank) {
            // Update existing tank
            const [updateResult] = await pool.execute(`UPDATE fish_tanks SET 
                size_m3 = ?, volume_liters = ?, fish_type = ?
                WHERE system_id = ? AND tank_number = ?`, 
                [size_m3, volume_liters, fish_type.toLowerCase(), system_id, tank_number]);
            result = { id: existingTank.id, changes: updateResult.affectedRows };
        } else {
            // Create new tank
            const [insertResult] = await pool.execute(`INSERT INTO fish_tanks 
                (system_id, tank_number, size_m3, volume_liters, fish_type) 
                VALUES (?, ?, ?, ?, ?)`, 
                [system_id, tank_number, size_m3, volume_liters, fish_type.toLowerCase()]);
            result = { id: insertResult.insertId };
        }

        // Get the created/updated tank
        const [tankRows] = await pool.execute('SELECT * FROM fish_tanks WHERE system_id = ? AND tank_number = ?', 
            [system_id, tank_number]);
        const tank = tankRows[0];
        
        const statusCode = existingTank ? 200 : 201;
        const message = existingTank ? 'Fish tank updated successfully' : 'Fish tank created successfully';
        
        res.status(statusCode).json({
            message,
            tank
        });

    } catch (error) {
        console.error('Error creating/updating fish tank:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'A tank with this number already exists for this system' });
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
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

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        // First verify the system exists and belongs to the user
        const [systemRows] = await pool.execute('SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [systemId, req.user.userId]);
        const system = systemRows[0];

        if (!system) {            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Get all tanks for this system
        const [tanks] = await pool.execute('SELECT * FROM fish_tanks WHERE system_id = ? ORDER BY tank_number ASC', 
            [systemId]);        res.json({
            system_id: systemId,
            tanks: tanks || []
        });

    } catch (error) {
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

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        // First verify the system exists and belongs to the user
        const [systemRows] = await pool.execute('SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [systemId, req.user.userId]);
        const system = systemRows[0];

        if (!system) {            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Check if the tank exists
        const [tankRows] = await pool.execute('SELECT * FROM fish_tanks WHERE system_id = ? AND tank_number = ?', 
            [systemId, tankNum]);
        const tank = tankRows[0];

        if (!tank) {            return res.status(404).json({ error: 'Fish tank not found' });
        }

        // Delete the tank
        const [result] = await pool.execute('DELETE FROM fish_tanks WHERE system_id = ? AND tank_number = ?', 
            [systemId, tankNum]);
        if (result.affectedRows === 0) {
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

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        // First verify the system exists and belongs to the user
        const [systemRows] = await pool.execute('SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [systemId, req.user.userId]);
        const system = systemRows[0];

        if (!system) {            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Get the specific tank
        const [tankRows] = await pool.execute('SELECT * FROM fish_tanks WHERE system_id = ? AND tank_number = ?', 
            [systemId, tankNum]);
        const tank = tankRows[0];
        if (!tank) {
            return res.status(404).json({ error: 'Fish tank not found' });
        }

        res.json(tank);

    } catch (error) {
        console.error('Error fetching fish tank:', error);
        res.status(500).json({ error: 'Failed to fetch fish tank' });
    }
});

module.exports = router;