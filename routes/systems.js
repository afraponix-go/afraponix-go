const express = require('express');
const crypto = require('crypto');
const { getDatabase, getDatabaseConnection } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { canAccessSystem } = require('../utils/systemAccess');
const { ensureUserFarm } = require('../utils/farms');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// System ids are generated server-side and must be unguessable: they are the
// only thing identifying a tenant's system in most API paths. The legacy
// `system_<Date.now()>` format was enumerable. Existing ids keep working —
// this only governs newly created systems.
function generateSystemId() {
    return `system_${crypto.randomUUID()}`;
}

// Get all systems the user can see: their own plus any shared with them and
// accepted. shared_permission is null for owned systems.
router.get('/', async (req, res) => {
    try {
        const pool = getDatabase();

        const [systems] = await pool.execute(
            `SELECT s.*,
                    CASE WHEN s.user_id = ? THEN NULL ELSE ss.permission_level END AS shared_permission,
                    (s.user_id = ?) AS is_owner
             FROM systems s
             LEFT JOIN system_shares ss
                    ON ss.system_id = s.id AND ss.shared_with_id = ? AND ss.status = 'accepted'
             WHERE s.user_id = ? OR ss.id IS NOT NULL
             GROUP BY s.id
             ORDER BY s.created_at DESC`,
            [req.user.userId, req.user.userId, req.user.userId, req.user.userId]
        );

        res.json(systems);

    } catch (error) {
        console.error('Error fetching systems:', error);
        res.status(500).json({ error: 'Failed to fetch systems' });
    }
});

// Get specific system (owner or an accepted share).
router.get('/:id', async (req, res) => {
    try {
        const pool = getDatabase();

        if (!(await canAccessSystem(req.params.id, req.user.userId))) {
            return res.status(404).json({ error: 'System not found' });
        }

        const [systemRows] = await pool.execute('SELECT * FROM systems WHERE id = ?', [req.params.id]);
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
        system_name,
        system_type,
        fish_type,
        fish_tank_count,
        total_fish_volume,
        grow_bed_count,
        total_grow_volume,
        total_grow_area
    } = req.body;

    if (!system_name) {
        return res.status(400).json({ error: 'System name is required' });
    }

    // The id is generated here and any client-supplied one is ignored. It used
    // to be a caller-chosen `system_<millisecond timestamp>`, which is guessable
    // and made system ids enumerable across tenants; a random UUID is not.
    const id = generateSystemId();

    try {
        const pool = getDatabase();

        // Every system belongs to a farm. Use the caller-supplied farm_id when it's
        // one of their own farms, otherwise their default farm (created if needed).
        let farmId = null;
        if (req.body.farm_id) {
            const [f] = await pool.execute('SELECT id FROM farms WHERE id = ? AND owner_id = ?', [req.body.farm_id, req.user.userId]);
            if (f.length) farmId = f[0].id;
        }
        if (!farmId) farmId = await ensureUserFarm(pool, req.user.userId);

        const [result] = await pool.execute(`INSERT INTO systems
            (id, user_id, farm_id, system_name, system_type, fish_type, fish_tank_count, total_fish_volume, grow_bed_count, total_grow_volume, total_grow_area)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, req.user.userId, farmId, system_name, system_type || 'media-bed', fish_type || 'tilapia',
             fish_tank_count || 1, total_fish_volume || 1000,
             grow_bed_count || 4, total_grow_volume || 800, total_grow_area || 2.0]
        );

        // Return the created system
        const [createdSystemRows] = await pool.execute('SELECT * FROM systems WHERE id = ?', [id]);
        const createdSystem = createdSystemRows[0];

        res.status(201).json(createdSystem);

    } catch (error) {
        console.error('Error creating system:', error);
        res.status(500).json({ error: 'Failed to create system' });
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

// The metric keys a system may choose to track. Kept in sync with the client's
// water-quality field list.
const TRACKABLE_METRICS = new Set([
    'ph', 'ec', 'dissolved_oxygen', 'temperature', 'humidity', 'salinity',
    'ammonia', 'nitrite', 'nitrate', 'iron', 'potassium', 'calcium',
    'phosphorus', 'magnesium'
]);

// Set which metrics this system tracks. Owner-only (it is system configuration).
// Body: { metrics: string[] }. An empty array means "track none"; to reset to
// "track all", send every key (the UI does this) — NULL is only the initial
// default for systems that have never been configured.
router.put('/:id/metrics', async (req, res) => {
    const { metrics } = req.body;

    if (!Array.isArray(metrics)) {
        return res.status(400).json({ error: 'metrics must be an array of metric keys' });
    }
    const invalid = metrics.filter((m) => !TRACKABLE_METRICS.has(m));
    if (invalid.length) {
        return res.status(400).json({ error: `Unknown metric keys: ${invalid.join(', ')}` });
    }

    try {
        const pool = getDatabase();
        // Owner-only: match on user_id so a shared user cannot change it.
        const [result] = await pool.execute(
            'UPDATE systems SET tracked_metrics = ? WHERE id = ? AND user_id = ?',
            [JSON.stringify([...new Set(metrics)]), req.params.id, req.user.userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        const [rows] = await pool.execute('SELECT * FROM systems WHERE id = ?', [req.params.id]);
        res.json(rows[0]);
    } catch (error) {
        console.error('Error updating tracked metrics:', error);
        res.status(500).json({ error: 'Failed to update tracked metrics' });
    }
});

// Create demo system using SQLite demo database
router.post('/create-demo', async (req, res) => {
    const { system_name } = req.body;
    const SQLiteDemoImporter = require('../database/sqlite-demo-importer');

    if (!system_name) {
        return res.status(400).json({ error: 'System name is required' });
    }

    // Always the authenticated user. A user_id in the request body was
    // previously honoured, which let a caller create a demo system owned by
    // someone else's account. authenticateToken guarantees req.user is set.
    const targetUserId = req.user.userId;


    let connection;

    try {
        // Use a dedicated connection for transaction-based operations
        connection = await getDatabaseConnection();
        
        // Generate new system ID
        let newSystemId = generateSystemId();
        
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
                
                // Rollback any partial changes from SQLite import
                await connection.execute('ROLLBACK');
                
                // Start a new transaction for simple demo creator
                await connection.execute('START TRANSACTION');
                
                // Generate a new system ID for the fallback
                const fallbackSystemId = generateSystemId();
                
                // Fallback to simple demo creator
                const SimpleDemoCreator = require('../database/simple-demo-creator');
                const simpleCreator = new SimpleDemoCreator(connection);
                importResult = await simpleCreator.createDemoSystem(fallbackSystemId, targetUserId, system_name);
                
                // Update newSystemId to the fallback ID
                newSystemId = fallbackSystemId;
                console.log('✅ Demo system created using simple creator with fallback ID:', fallbackSystemId);
            }
            
            // Commit transaction
            await connection.execute('COMMIT');

            // Assign the demo system to the user's default farm (non-fatal — the
            // deploy backfill catches it if this ever fails).
            try {
                const pool = getDatabase();
                const farmId = await ensureUserFarm(pool, targetUserId);
                await pool.execute('UPDATE systems SET farm_id = ? WHERE id = ? AND farm_id IS NULL', [farmId, newSystemId]);
            } catch (e) {
                console.error('Demo system farm assignment failed (non-fatal):', e.message);
            }

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
// Tables carrying a system_id that older databases may not have an ON DELETE
// CASCADE foreign key for — long-lived databases created these tables before the
// constraints were declared, and CREATE TABLE IF NOT EXISTS never adds them
// retroactively, so every deletion leaked orphaned rows. The
// 2026-07-system-id-cascade-fks migration backfills the constraints; these
// explicit deletes stay as a safety net for any database that hasn't run it yet.
// Everything else (fish_tanks, grow_beds, water_quality, plant_growth,
// plant_allocations, fish_health, fish_feeding, operations, sensor_configs,
// spray_programmes, system_credentials, system_shares, water_quality_archived)
// has always cascaded — as do the grandchildren sensor_readings and
// spray_applications.
const UNCASCADED_SYSTEM_TABLES = [
    'fish_events',
    'fish_harvest',
    'fish_inventory',
    'nutrient_readings',
    'nutrient_deficiency_images',
    'import_history'
];

router.delete('/:id', async (req, res) => {
    const systemId = req.params.id;
    let connection;

    try {
        const pool = getDatabase();

        // First verify the system exists and belongs to the user
        const [systemRows] = await pool.execute('SELECT id FROM systems WHERE id = ? AND user_id = ?',
            [systemId, req.user.userId]);

        if (!systemRows[0]) {
            return res.status(404).json({ error: 'System not found' });
        }

        // Delete in a transaction so a failure part-way cannot leave the system
        // half-deleted (data gone but the system row still present, or vice versa).
        connection = await pool.getConnection();
        await connection.beginTransaction();

        for (const table of UNCASCADED_SYSTEM_TABLES) {
            await connection.execute(`DELETE FROM ${table} WHERE system_id = ?`, [systemId]);
        }

        // Dropping the system cascades to every table that has an FK to it.
        await connection.execute('DELETE FROM systems WHERE id = ? AND user_id = ?',
            [systemId, req.user.userId]);

        await connection.commit();

        res.json({ message: 'System and all related data deleted successfully' });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Rollback failed while deleting system:', rollbackError);
            }
        }
        console.error('Error deleting system:', error);
        res.status(500).json({ error: 'Failed to delete system' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;