const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all systems for authenticated user
router.get('/', async (req, res) => {
    try {
        const pool = getDatabase();

        const [systems] = await pool.execute(
            'SELECT * FROM systems WHERE user_id = ? ORDER BY created_at DESC', 
            [req.user.userId]
        );

        res.json(systems);

    } catch (error) {
        console.error('Error fetching systems:', error);
        res.status(500).json({ error: 'Failed to fetch systems' });
    }
});

// Get specific system
router.get('/:id', async (req, res) => {
    try {
        const pool = getDatabase();

        const [systemRows] = await pool.execute(
            'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [req.params.id, req.user.userId]
        );

        if (systemRows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        res.json(systemRows[0]);

    } catch (error) {
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

    try {
        const pool = getDatabase();
        
        const [result] = await pool.execute(`INSERT INTO systems 
            (id, user_id, system_name, system_type, fish_type, fish_tank_count, total_fish_volume, grow_bed_count, total_grow_volume, total_grow_area) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [id, req.user.userId, system_name, system_type || 'media-bed', fish_type || 'tilapia',
             fish_tank_count || 1, total_fish_volume || 1000, 
             grow_bed_count || 4, total_grow_volume || 800, total_grow_area || 2.0]
        );

        // Return the created system
        const [createdSystemRows] = await pool.execute('SELECT * FROM systems WHERE id = ?', [id]);
        const createdSystem = createdSystemRows[0];

        res.status(201).json(createdSystem);

    } catch (error) {
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

    try {
        const pool = getDatabase();
        
        const query = `UPDATE systems SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`;
        const [result] = await pool.execute(query, [...updateValues, req.params.id, req.user.userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        // Return the updated system
        const [updatedSystemRows] = await pool.execute('SELECT * FROM systems WHERE id = ?', [req.params.id]);
        const updatedSystem = updatedSystemRows[0];

        res.json(updatedSystem);

    } catch (error) {
        console.error('Error updating system:', error);
        res.status(500).json({ error: 'Failed to update system' });
    }
});

// Create demo system using SQLite demo database
router.post('/create-demo', async (req, res) => {
    const { system_name, user_id } = req.body;
    const SQLiteDemoImporter = require('../database/sqlite-demo-importer');
    
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

    
    let connection;

    try {
        connection = await getDatabase();
        
        // Generate new system ID
        const newSystemId = `system_${Date.now()}`;
        
        // Start transaction
        await connection.execute('START TRANSACTION');
        
        try {
            let importResult;
            
            try {
                // Try to use SQLite importer first
                const importer = new SQLiteDemoImporter(connection);
                importResult = await importer.importDemoSystem(newSystemId, targetUserId);
                console.log('✅ Demo system created using SQLite database');
            } catch (sqliteError) {
                console.log('⚠️ SQLite demo import failed, using simple demo creator:', sqliteError.message);
                
                // Fallback to simple demo creator
                const SimpleDemoCreator = require('../database/simple-demo-creator');
                const simpleCreator = new SimpleDemoCreator(connection);
                importResult = await simpleCreator.createDemoSystem(newSystemId, targetUserId, system_name);
                console.log('✅ Demo system created using simple creator');
            }
            
            // Commit transaction
            await connection.execute('COMMIT');
            
            // Query for the created system
            const [createdSystemRows] = await connection.execute(
                'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
                [newSystemId, targetUserId]
            );
            
            if (createdSystemRows.length === 0) {
                return res.status(500).json({ 
                    error: 'System creation failed - transaction may have been rolled back',
                    system_id: newSystemId,
                    user_id: targetUserId
                });
            }
            
            const createdSystem = createdSystemRows[0];
            
            const response = {
                ...createdSystem,
                message: 'Demo system created successfully with comprehensive sample data',
                imported_data: importResult.imported
            };
            
            
            res.status(201).json(response);
            
        } catch (transactionError) {
            console.error('Transaction error occurred:', transactionError);
            await connection.execute('ROLLBACK');
            throw transactionError;
        }
        
    } catch (error) {
        console.error('Failed to create demo system:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        // Determine error type for better user feedback
        let errorMessage = 'Failed to create demo system';
        let statusCode = 500;
        
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'System with this name already exists';
            statusCode = 409;
        } else if (error.code === 'ENOENT' || (error.message && error.message.includes('demo-data.sqlite'))) {
            errorMessage = 'Demo database not found - please ensure demo-data.sqlite exists';
            statusCode = 404;
        } else if (error.message && error.message.includes('Failed to open demo database')) {
            errorMessage = 'Could not open demo database file - check file permissions';
            statusCode = 500;
        } else if (error.message && error.message.includes('sqlite3')) {
            errorMessage = 'SQLite library error - ensure sqlite3 is installed';
            statusCode = 500;
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
            errorMessage = 'Database connection error';
            statusCode = 503;
        } else if (error.message) {
            // Include the actual error message for debugging
            errorMessage = `Failed to create demo system: ${error.message}`;
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
            } catch (closeError) {
                console.error('Error closing database connection:', closeError);
            }
        }
    }
});

// Delete system
router.delete('/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        
        // First verify the system exists and belongs to the user
        const [systemRows] = await pool.execute('SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [req.params.id, req.user.userId]);
        const system = systemRows[0];

        if (!system) {
            return res.status(404).json({ error: 'System not found' });
        }

        // Delete all related data in the correct order (to handle foreign key constraints)
        
        // Delete plant allocations
        await pool.execute('DELETE FROM plant_allocations WHERE system_id = ?', [req.params.id]);

        // Delete nutrient readings (consolidated table)
        await pool.execute('DELETE FROM nutrient_readings WHERE system_id = ?', [req.params.id]);

        // Delete plant growth records
        await pool.execute('DELETE FROM plant_growth WHERE system_id = ?', [req.params.id]);

        // Delete fish health records
        await pool.execute('DELETE FROM fish_health WHERE system_id = ?', [req.params.id]);

        // Delete grow beds
        await pool.execute('DELETE FROM grow_beds WHERE system_id = ?', [req.params.id]);

        // Finally delete the system itself
        await pool.execute('DELETE FROM systems WHERE id = ? AND user_id = ?', 
            [req.params.id, req.user.userId]);

        res.json({ message: 'System and all related data deleted successfully' });

    } catch (error) {
        console.error('Error deleting system:', error);
        res.status(500).json({ error: 'Failed to delete system' });
    }
});

module.exports = router;