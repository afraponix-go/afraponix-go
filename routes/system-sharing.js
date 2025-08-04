const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get shared users for a system
router.get('/users', (req, res) => {
    const { system_id } = req.query;
    const db = getDatabase();

    if (!system_id) {
        return res.status(400).json({ error: 'System ID is required' });
    }

    // Check if user owns the system
    db.get(
        'SELECT * FROM systems WHERE id = ? AND user_id = ?',
        [system_id, req.user.userId],
        (err, system) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (!system) {
                return res.status(403).json({ error: 'Not authorized to view this system' });
            }

            // Get shared users with their details
            db.all(`
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
            `, [system_id], (err, shares) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({ shares: shares || [] });
            });
        }
    );
});

// Get pending invitations for a system
router.get('/invitations', (req, res) => {
    const { system_id } = req.query;
    const db = getDatabase();

    if (!system_id) {
        return res.status(400).json({ error: 'System ID is required' });
    }

    // Check if user owns the system
    db.get(
        'SELECT * FROM systems WHERE id = ? AND user_id = ?',
        [system_id, req.user.userId],
        (err, system) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (!system) {
                return res.status(403).json({ error: 'Not authorized to view this system' });
            }

            // Get pending invitations
            db.all(`
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
            `, [system_id], (err, invitations) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({ invitations: invitations || [] });
            });
        }
    );
});

// Send invitation to share system
router.post('/invite', (req, res) => {
    const { system_id, email, permission_level } = req.body;
    const db = getDatabase();

    if (!system_id || !email || !permission_level) {
        return res.status(400).json({ error: 'System ID, email, and permission level are required' });
    }

    // Validate permission level
    const validPermissions = ['view', 'collaborator', 'admin'];
    if (!validPermissions.includes(permission_level)) {
        return res.status(400).json({ error: 'Invalid permission level' });
    }

    // Check if user owns the system
    db.get(
        'SELECT * FROM systems WHERE id = ? AND user_id = ?',
        [system_id, req.user.userId],
        (err, system) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (!system) {
                return res.status(403).json({ error: 'Not authorized to share this system' });
            }

            // Find user by email
            db.get(
                'SELECT * FROM users WHERE email = ?',
                [email],
                (err, user) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }

                    if (!user) {
                        return res.status(404).json({ error: 'User not found with that email address' });
                    }

                    if (user.id === req.user.userId) {
                        return res.status(400).json({ error: 'Cannot share system with yourself' });
                    }

                    // Check if already shared
                    db.get(
                        'SELECT * FROM system_shares WHERE system_id = ? AND shared_with_id = ?',
                        [system_id, user.id],
                        (err, existingShare) => {
                            if (err) {
                                console.error('Database error:', err);
                                return res.status(500).json({ error: 'Database error' });
                            }

                            if (existingShare) {
                                return res.status(400).json({ error: 'System is already shared with this user' });
                            }

                            // Create invitation
                            db.run(`
                                INSERT INTO system_shares (system_id, owner_id, shared_with_id, permission_level, status)
                                VALUES (?, ?, ?, ?, 'pending')
                            `, [system_id, req.user.userId, user.id, permission_level], function(err) {
                                if (err) {
                                    console.error('Database error:', err);
                                    return res.status(500).json({ error: 'Database error' });
                                }

                                // TODO: Send email notification
                                // For now, we'll just return success
                                res.json({ 
                                    success: true, 
                                    message: 'Invitation sent successfully',
                                    invitation_id: this.lastID
                                });
                            });
                        }
                    );
                }
            );
        }
    );
});

// Update user permission level
router.put('/permission', (req, res) => {
    const { share_id, permission_level } = req.body;
    const db = getDatabase();

    if (!share_id || !permission_level) {
        return res.status(400).json({ error: 'Share ID and permission level are required' });
    }

    // Validate permission level
    const validPermissions = ['view', 'collaborator', 'admin'];
    if (!validPermissions.includes(permission_level)) {
        return res.status(400).json({ error: 'Invalid permission level' });
    }

    // Check if user owns the system
    db.get(`
        SELECT ss.*, s.user_id as system_owner_id
        FROM system_shares ss
        JOIN systems s ON ss.system_id = s.id
        WHERE ss.id = ?
    `, [share_id], (err, share) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!share || share.system_owner_id !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized to modify this share' });
        }

        // Update permission level
        db.run(
            'UPDATE system_shares SET permission_level = ? WHERE id = ?',
            [permission_level, share_id],
            (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({ success: true, message: 'Permission updated successfully' });
            }
        );
    });
});

// Remove user access
router.delete('/access/:share_id', (req, res) => {
    const { share_id } = req.params;
    const db = getDatabase();

    // Check if user owns the system
    db.get(`
        SELECT ss.*, s.user_id as system_owner_id
        FROM system_shares ss
        JOIN systems s ON ss.system_id = s.id
        WHERE ss.id = ?
    `, [share_id], (err, share) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!share || share.system_owner_id !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized to remove this access' });
        }

        // Remove access
        db.run('DELETE FROM system_shares WHERE id = ?', [share_id], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({ success: true, message: 'Access removed successfully' });
        });
    });
});

// Get public access settings
router.get('/public-settings', (req, res) => {
    const { system_id } = req.query;
    const db = getDatabase();

    if (!system_id) {
        return res.status(400).json({ error: 'System ID is required' });
    }

    // Check if user owns the system
    db.get(
        'SELECT * FROM systems WHERE id = ? AND user_id = ?',
        [system_id, req.user.userId],
        (err, system) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (!system) {
                return res.status(403).json({ error: 'Not authorized to view this system' });
            }

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
        }
    );
});

// Update public access settings
router.put('/public-settings', (req, res) => {
    const { system_id, enabled, permissions } = req.body;
    const db = getDatabase();

    if (!system_id) {
        return res.status(400).json({ error: 'System ID is required' });
    }

    // Check if user owns the system
    db.get(
        'SELECT * FROM systems WHERE id = ? AND user_id = ?',
        [system_id, req.user.userId],
        (err, system) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (!system) {
                return res.status(403).json({ error: 'Not authorized to modify this system' });
            }

            // For now, just return success since we don't have public access table yet
            const publicLink = enabled ? `https://app.aquaponics.online/public/${system_id}` : null;
            
            res.json({
                success: true,
                message: 'Public access settings updated',
                public_link: publicLink
            });
        }
    );
});

module.exports = router;