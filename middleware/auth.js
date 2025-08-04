const jwt = require('jsonwebtoken');

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

function isAdmin(req, res, next) {
    if (!req.user || req.user.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = { 
    authenticateToken, 
    requireRole, 
    requireSubscription, 
    isAdmin 
};