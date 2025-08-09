const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get shared users for a system
router.get('/users', async (req, res) => {
    const { system_id } = req.query;
    let connection;

    if (!system_id) {
        return res.status(400).json({ error: 'System ID is required' });
    }

    try {
        connection = await getDatabase();
        
        // Check if user owns the system
        const [systemRows] = await connection.execute(
            'SELECT * FROM systems WHERE id = ? AND user_id = ?',
            [system_id, req.user.userId]
        );
        const system = systemRows[0];

        if (!system) {
            await connection.end();
            return res.status(403).json({ error: 'Not authorized to view this system' });
        }

        // Get shared users with their details
        const [shares] = await connection.execute(`
            SELECT 
                ss.id,
                ss.permission_level,
                ss.status,
                ss.created_at,
                u.username,
                u.email,
                u.first_name,
                u.last_name
            FROM system_shares ss
            JOIN users u ON ss.shared_with_id = u.id
            WHERE ss.system_id = ? AND ss.status = 'accepted'
            ORDER BY ss.created_at DESC
        `, [system_id]);

        await connection.end();
        res.json({ shares: shares || [] });

    } catch (error) {
        if (connection) await connection.end();
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get pending invitations for a system
router.get('/invitations', async (req, res) => {
    const { system_id } = req.query;
    let connection;

    if (!system_id) {
        return res.status(400).json({ error: 'System ID is required' });
    }

    try {
        connection = await getDatabase();
        
        // Check if user owns the system
        const [systemRows] = await connection.execute(
            'SELECT * FROM systems WHERE id = ? AND user_id = ?',
            [system_id, req.user.userId]
        );
        const system = systemRows[0];

        if (!system) {
            await connection.end();
            return res.status(403).json({ error: 'Not authorized to view this system' });
        }

        // Get pending invitations
        const [invitations] = await connection.execute(`
            SELECT 
                ss.id,
                ss.permission_level,
                ss.created_at,
                u.username,
                u.email,
                u.first_name,
                u.last_name
            FROM system_shares ss
            JOIN users u ON ss.shared_with_id = u.id
            WHERE ss.system_id = ? AND ss.status = 'pending'
            ORDER BY ss.created_at DESC
        `, [system_id]);

        await connection.end();
        res.json({ invitations: invitations || [] });

    } catch (error) {
        if (connection) await connection.end();
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Send invitation to share system
router.post('/invite', async (req, res) => {
    const { system_id, email, permission_level } = req.body;
    let connection;

    if (!system_id || !email || !permission_level) {
        return res.status(400).json({ error: 'System ID, email, and permission level are required' });
    }

    // Validate permission level
    const validPermissions = ['view', 'collaborator', 'admin'];
    if (!validPermissions.includes(permission_level)) {
        return res.status(400).json({ error: 'Invalid permission level' });
    }

    try {
        connection = await getDatabase();
        
        // Check if user owns the system
        const [systemRows] = await connection.execute(
            'SELECT * FROM systems WHERE id = ? AND user_id = ?',
            [system_id, req.user.userId]
        );
        const system = systemRows[0];

        if (!system) {
            await connection.end();
            return res.status(403).json({ error: 'Not authorized to share this system' });
        }

        // Find user by email
        const [userRows] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        const user = userRows[0];

        if (!user) {
            await connection.end();
            return res.status(404).json({ error: 'User not found with that email address' });
        }

        if (user.id === req.user.userId) {
            await connection.end();
            return res.status(400).json({ error: 'Cannot share system with yourself' });
        }

        // Check if already shared
        const [existingRows] = await connection.execute(
            'SELECT * FROM system_shares WHERE system_id = ? AND shared_with_id = ?',
            [system_id, user.id]
        );
        const existingShare = existingRows[0];

        if (existingShare) {
            await connection.end();
            return res.status(400).json({ error: 'System is already shared with this user' });
        }

        // Create invitation
        const [result] = await connection.execute(`
            INSERT INTO system_shares (system_id, owner_id, shared_with_id, permission_level, status)
            VALUES (?, ?, ?, ?, 'pending')
        `, [system_id, req.user.userId, user.id, permission_level]);

        await connection.end();
        
        // TODO: Send email notification
        // For now, we'll just return success
        res.json({ 
            success: true, 
            message: 'Invitation sent successfully',
            invitation_id: result.insertId
        });

    } catch (error) {
        if (connection) await connection.end();
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update user permission level
router.put('/permission', async (req, res) => {
    const { share_id, permission_level } = req.body;
    let connection;

    if (!share_id || !permission_level) {
        return res.status(400).json({ error: 'Share ID and permission level are required' });
    }

    // Validate permission level
    const validPermissions = ['view', 'collaborator', 'admin'];
    if (!validPermissions.includes(permission_level)) {
        return res.status(400).json({ error: 'Invalid permission level' });
    }

    try {
        connection = await getDatabase();
        
        // Check if user owns the system
        const [shareRows] = await connection.execute(`
            SELECT ss.*, s.user_id as system_owner_id
            FROM system_shares ss
            JOIN systems s ON ss.system_id = s.id
            WHERE ss.id = ?
        `, [share_id]);
        const share = shareRows[0];

        if (!share || share.system_owner_id !== req.user.userId) {
            await connection.end();
            return res.status(403).json({ error: 'Not authorized to modify this share' });
        }

        // Update permission level
        await connection.execute(
            'UPDATE system_shares SET permission_level = ? WHERE id = ?',
            [permission_level, share_id]
        );

        await connection.end();
        res.json({ success: true, message: 'Permission updated successfully' });

    } catch (error) {
        if (connection) await connection.end();
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Remove user access
router.delete('/access/:share_id', async (req, res) => {
    const { share_id } = req.params;
    let connection;

    try {
        connection = await getDatabase();
        
        // Check if user owns the system
        const [shareRows] = await connection.execute(`
            SELECT ss.*, s.user_id as system_owner_id
            FROM system_shares ss
            JOIN systems s ON ss.system_id = s.id
            WHERE ss.id = ?
        `, [share_id]);
        const share = shareRows[0];

        if (!share || share.system_owner_id !== req.user.userId) {
            await connection.end();
            return res.status(403).json({ error: 'Not authorized to remove this access' });
        }

        // Remove access
        await connection.execute('DELETE FROM system_shares WHERE id = ?', [share_id]);

        await connection.end();
        res.json({ success: true, message: 'Access removed successfully' });

    } catch (error) {
        if (connection) await connection.end();
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get public access settings
router.get('/public-settings', async (req, res) => {
    const { system_id } = req.query;
    let connection;

    if (!system_id) {
        return res.status(400).json({ error: 'System ID is required' });
    }

    try {
        connection = await getDatabase();
        
        // Check if user owns the system
        const [systemRows] = await connection.execute(
            'SELECT * FROM systems WHERE id = ? AND user_id = ?',
            [system_id, req.user.userId]
        );
        const system = systemRows[0];

        if (!system) {
            await connection.end();
            return res.status(403).json({ error: 'Not authorized to view this system' });
        }

        await connection.end();
        
        // For now, return mock data since we don't have public access table yet
        res.json({
            public_access_enabled: false,
            public_link: null,
            view_permissions: {
                dashboard: true,
                data_entries: false,
                reports: true
            }
        });

    } catch (error) {
        if (connection) await connection.end();
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update public access settings
router.put('/public-settings', async (req, res) => {
    const { system_id, enabled, permissions } = req.body;
    let connection;

    if (!system_id) {
        return res.status(400).json({ error: 'System ID is required' });
    }

    try {
        connection = await getDatabase();
        
        // Check if user owns the system
        const [systemRows] = await connection.execute(
            'SELECT * FROM systems WHERE id = ? AND user_id = ?',
            [system_id, req.user.userId]
        );
        const system = systemRows[0];

        if (!system) {
            await connection.end();
            return res.status(403).json({ error: 'Not authorized to modify this system' });
        }

        await connection.end();
        
        // For now, just return success since we don't have public access table yet
        const publicLink = enabled ? `https://app.aquaponics.online/public/${system_id}` : null;
        
        res.json({
            success: true,
            message: 'Public access settings updated',
            public_link: publicLink
        });

    } catch (error) {
        if (connection) await connection.end();
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;