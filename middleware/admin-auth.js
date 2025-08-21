const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init-mariadb');

// Admin authentication middleware
const requireAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        // Check if user is admin
        const pool = getDatabase();
        const [userRows] = await pool.execute(
            'SELECT id, username, email, user_role, role FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (userRows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token. User not found.'
            });
        }

        const user = userRows[0];
        
        // Check if user has admin role (check both role columns for flexibility)
        const isAdmin = user.role === 'admin' || user.user_role === 'admin';
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Admin privileges required.'
            });
        }

        req.adminUser = user;
        next();

    } catch (error) {
        console.error('Admin authentication error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token.'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired. Please log in again.'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Authentication failed.'
        });
    }
};

// Check admin status without requiring (for UI permissions)
const checkAdminStatus = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            req.isAdmin = false;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const pool = getDatabase();
        
        const [userRows] = await pool.execute(
            'SELECT role FROM users WHERE id = ? AND is_active = true',
            [decoded.userId]
        );

        req.isAdmin = userRows.length > 0 && userRows[0].role === 'admin';
        next();

    } catch (error) {
        req.isAdmin = false;
        next();
    }
};

module.exports = {
    requireAdmin,
    checkAdminStatus
};