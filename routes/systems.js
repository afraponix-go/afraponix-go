const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all systems for authenticated user
router.get('/', async (req, res) => {
    const db = getDatabase();

    try {
        const systems = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM systems WHERE user_id = ? ORDER BY created_at DESC', 
                [req.user.userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        db.close();
        res.json(systems);

    } catch (error) {
        db.close();
        console.error('Error fetching systems:', error);
        res.status(500).json({ error: 'Failed to fetch systems' });
    }
});

// Get specific system
router.get('/:id', async (req, res) => {
    const db = getDatabase();

    try {
        const system = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM systems WHERE id = ? AND user_id = ?', 
                [req.params.id, req.user.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        db.close();

        if (!system) {
            return res.status(404).json({ error: 'System not found' });
        }

        res.json(system);

    } catch (error) {
        db.close();
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

    const db = getDatabase();

    try {
        const result = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO systems 
                (id, user_id, system_name, system_type, fish_type, fish_tank_count, total_fish_volume, grow_bed_count, total_grow_volume, total_grow_area) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [id, req.user.userId, system_name, system_type || 'media-bed', fish_type || 'tilapia',
                 fish_tank_count || 1, total_fish_volume || 1000, 
                 grow_bed_count || 4, total_grow_volume || 800, total_grow_area || 2.0], 
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });

        // Return the created system
        const createdSystem = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM systems WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        db.close();
        res.status(201).json(createdSystem);

    } catch (error) {
        db.close();
        console.error('Error creating system:', error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
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

    const db = getDatabase();

    try {
        const result = await new Promise((resolve, reject) => {
            db.run(`UPDATE systems SET 
                system_name = ?, system_type = ?, fish_type = ?, fish_tank_count = ?, 
                total_fish_volume = ?, grow_bed_count = ?, total_grow_volume = ?, total_grow_area = ? 
                WHERE id = ? AND user_id = ?`, 
                [system_name, system_type, fish_type, fish_tank_count, total_fish_volume, 
                 grow_bed_count, total_grow_volume, total_grow_area, req.params.id, req.user.userId], 
                function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                }
            );
        });

        if (result.changes === 0) {
            db.close();
            return res.status(404).json({ error: 'System not found' });
        }

        // Return the updated system
        const updatedSystem = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM systems WHERE id = ?', [req.params.id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        db.close();
        res.json(updatedSystem);

    } catch (error) {
        db.close();
        console.error('Error updating system:', error);
        res.status(500).json({ error: 'Failed to update system' });
    }
});

// Delete system
router.delete('/:id', async (req, res) => {
    const db = getDatabase();

    try {
        const result = await new Promise((resolve, reject) => {
            db.run('DELETE FROM systems WHERE id = ? AND user_id = ?', 
                [req.params.id, req.user.userId], 
                function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                }
            );
        });

        db.close();

        if (result.changes === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        res.json({ message: 'System deleted successfully' });

    } catch (error) {
        db.close();
        console.error('Error deleting system:', error);
        res.status(500).json({ error: 'Failed to delete system' });
    }
});

module.exports = router;