const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(isAdmin);

// Get all users (admin only)
router.get('/users', async (req, res) => {
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        const [users] = await pool.execute(`
            SELECT 
                id, username, email, first_name, last_name, 
                user_role, subscription_status, created_at
            FROM users 
            ORDER BY created_at DESC
        `);        res.json(users);

    } catch (error) {
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

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
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

        await pool.execute(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Get updated user info
        const [userRows] = await pool.execute(
            'SELECT id, username, email, first_name, last_name, user_role, subscription_status FROM users WHERE id = ?',
            [userId]
        );
        const updatedUser = userRows[0];        res.json({ 
            success: true, 
            message: 'User updated successfully',
            user: updatedUser
        });

    } catch (error) {
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
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [passwordHash, userId]
        );        res.json({ 
            success: true, 
            message: 'Password reset successfully' 
        });

    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Get user's systems (admin can view any user's systems)
router.get('/users/:userId/systems', async (req, res) => {
    const { userId } = req.params;
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        const [systems] = await pool.execute(
            'SELECT * FROM systems WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );        res.json(systems);

    } catch (error) {
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

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        await pool.execute(
            'DELETE FROM users WHERE id = ?',
            [userId]
        );        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get system statistics (admin dashboard)
router.get('/stats', async (req, res) => {
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        const stats = {};

        // User counts by role
        const [userStats] = await pool.execute(`
            SELECT 
                user_role,
                subscription_status,
                COUNT(*) as count
            FROM users 
            GROUP BY user_role, subscription_status
        `);

        // Total systems
        const [systemRows] = await pool.execute('SELECT COUNT(*) as count FROM systems');
        const systemCount = systemRows[0].count;

        // Recent registrations (last 30 days) - Convert SQLite datetime to MariaDB DATE_SUB
        const [recentRows] = await pool.execute(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        const recentUsers = recentRows[0].count;

        stats.users = userStats;
        stats.totalSystems = systemCount;
        stats.recentRegistrations = recentUsers;        res.json(stats);

    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;