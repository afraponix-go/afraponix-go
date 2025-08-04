const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(isAdmin);

// Get all users (admin only)
router.get('/users', async (req, res) => {
    const db = getDatabase();

    try {
        const users = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    id, username, email, first_name, last_name, 
                    user_role, subscription_status, created_at
                FROM users 
                ORDER BY created_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        db.close();
        res.json(users);

    } catch (error) {
        db.close();
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update user role and subscription
router.put('/users/:userId', async (req, res) => {
    const { userRole, subscriptionStatus } = req.body;
    const { userId } = req.params;

    if (!userRole && !subscriptionStatus) {
        return res.status(400).json({ error: 'User role or subscription status required' });
    }

    const validRoles = ['basic', 'subscribed', 'admin'];
    const validSubscriptions = ['basic', 'subscribed'];

    if (userRole && !validRoles.includes(userRole)) {
        return res.status(400).json({ error: 'Invalid user role' });
    }

    if (subscriptionStatus && !validSubscriptions.includes(subscriptionStatus)) {
        return res.status(400).json({ error: 'Invalid subscription status' });
    }

    const db = getDatabase();

    try {
        let updateFields = [];
        let updateValues = [];

        if (userRole) {
            updateFields.push('user_role = ?');
            updateValues.push(userRole);
        }

        if (subscriptionStatus) {
            updateFields.push('subscription_status = ?');
            updateValues.push(subscriptionStatus);
        }

        updateValues.push(userId);

        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Get updated user info
        const updatedUser = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id, username, email, first_name, last_name, user_role, subscription_status FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        db.close();
        res.json({ 
            success: true, 
            message: 'User updated successfully',
            user: updatedUser
        });

    } catch (error) {
        db.close();
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Reset user password (admin only)
router.post('/users/:userId/reset-password', async (req, res) => {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const bcrypt = require('bcryptjs');
    const db = getDatabase();

    try {
        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [passwordHash, userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        db.close();
        res.json({ 
            success: true, 
            message: 'Password reset successfully' 
        });

    } catch (error) {
        db.close();
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Get user's systems (admin can view any user's systems)
router.get('/users/:userId/systems', async (req, res) => {
    const { userId } = req.params;
    const db = getDatabase();

    try {
        const systems = await new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM systems WHERE user_id = ? ORDER BY created_at DESC',
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        db.close();
        res.json(systems);

    } catch (error) {
        db.close();
        console.error('Error fetching user systems:', error);
        res.status(500).json({ error: 'Failed to fetch user systems' });
    }
});

// Delete user (admin only)
router.delete('/users/:userId', async (req, res) => {
    const { userId } = req.params;
    
    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const db = getDatabase();

    try {
        await new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM users WHERE id = ?',
                [userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        db.close();
        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });

    } catch (error) {
        db.close();
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get system statistics (admin dashboard)
router.get('/stats', async (req, res) => {
    const db = getDatabase();

    try {
        const stats = {};

        // User counts by role
        const userStats = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    user_role,
                    subscription_status,
                    COUNT(*) as count
                FROM users 
                GROUP BY user_role, subscription_status
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Total systems
        const systemCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM systems', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Recent registrations (last 30 days)
        const recentUsers = await new Promise((resolve, reject) => {
            db.get(`
                SELECT COUNT(*) as count 
                FROM users 
                WHERE created_at > datetime('now', '-30 days')
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        stats.users = userStats;
        stats.totalSystems = systemCount;
        stats.recentRegistrations = recentUsers;

        db.close();
        res.json(stats);

    } catch (error) {
        db.close();
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;