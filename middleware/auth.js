const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init-mariadb');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        
        req.user = user;
        next();
    });
}

function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRole = req.user.userRole || 'basic';
        
        if (!roles.includes(userRole)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions', 
                required: roles, 
                current: userRole 
            });
        }

        next();
    };
}

function requireSubscription(levels = ['subscribed', 'admin']) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userSubscription = req.user.subscriptionStatus || 'basic';
        
        if (!levels.includes(userSubscription)) {
            return res.status(403).json({ 
                error: 'Subscription required', 
                message: 'This feature requires a subscription',
                required: levels,
                current: userSubscription
            });
        }

        next();
    };
}

// Admin gate. The JWT's role can be stale — a user promoted (or demoted) after
// their token was minted still carries the old role until it expires — so verify
// against the current role in the database, which is what /auth/user (and hence
// the UI's Admin tab) already reflects. Fail closed on any lookup error.
async function isAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute('SELECT user_role FROM users WHERE id = ?', [req.user.userId]);
        const role = rows[0]?.user_role;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user.userRole = 'admin'; // keep downstream handlers consistent
        next();
    } catch (error) {
        console.error('isAdmin role check failed:', error);
        return res.status(403).json({ error: 'Admin access required' });
    }
}

module.exports = { 
    authenticateToken, 
    requireRole, 
    requireSubscription, 
    isAdmin 
};