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