const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Save fish feeding schedule
router.post('/feeding-schedule', async (req, res) => {
    const { systemId, fishType, feedingsPerDay, feedingTimes } = req.body;

    if (!systemId || !fishType || !feedingsPerDay) {
        return res.status(400).json({ 
            error: 'System ID, fish type, and feedings per day are required' 
        });
    }

    const db = getDatabase();

    try {
        // Check if feeding schedule already exists for this system
        const existingSchedule = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id FROM fish_feeding WHERE system_id = ?',
                [systemId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (existingSchedule) {
            // Update existing schedule
            await new Promise((resolve, reject) => {
                db.run(`
                    UPDATE fish_feeding 
                    SET fish_type = ?, feedings_per_day = ?, feeding_times = ?
                    WHERE system_id = ?
                `, [fishType, feedingsPerDay, feedingTimes, systemId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } else {
            // Create new schedule
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO fish_feeding 
                    (system_id, fish_type, feedings_per_day, feeding_times)
                    VALUES (?, ?, ?, ?)
                `, [systemId, fishType, feedingsPerDay, feedingTimes], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        db.close();
        res.json({ success: true, message: 'Feeding schedule saved successfully' });

    } catch (error) {
        db.close();
        console.error('Error saving feeding schedule:', error);
        res.status(500).json({ error: 'Failed to save feeding schedule' });
    }
});

// Get fish feeding schedule for a system
router.get('/feeding-schedule/:systemId', async (req, res) => {
    const db = getDatabase();

    try {
        const schedule = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM fish_feeding WHERE system_id = ?',
                [req.params.systemId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        db.close();
        
        if (!schedule) {
            return res.status(404).json({ error: 'No feeding schedule found' });
        }

        res.json(schedule);

    } catch (error) {
        db.close();
        console.error('Error fetching feeding schedule:', error);
        res.status(500).json({ error: 'Failed to fetch feeding schedule' });
    }
});

// Delete fish feeding schedule
router.delete('/feeding-schedule/:systemId', async (req, res) => {
    const db = getDatabase();

    try {
        await new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM fish_feeding WHERE system_id = ?',
                [req.params.systemId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        db.close();
        res.json({ success: true, message: 'Feeding schedule deleted successfully' });

    } catch (error) {
        db.close();
        console.error('Error deleting feeding schedule:', error);
        res.status(500).json({ error: 'Failed to delete feeding schedule' });
    }
});

module.exports = router;