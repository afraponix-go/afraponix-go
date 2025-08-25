const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get custom crops for a specific system (system-scoped)
router.get('/system/:systemId', async (req, res) => {
    const { systemId } = req.params;
    
    try {
        const pool = getDatabase();
        
        // Verify system ownership
        const [systemRows] = await pool.execute(
            'SELECT user_id FROM systems WHERE id = ? AND user_id = ?',
            [systemId, req.user.userId]
        );
        
        if (systemRows.length === 0) {
            return res.status(404).json({ error: 'System not found or access denied' });
        }
        
        // Get custom crops for the user (custom crops are user-level, not system-level)
        const [customCrops] = await pool.execute(
            'SELECT * FROM custom_crops WHERE user_id = ? ORDER BY crop_name',
            [req.user.userId]
        );
        
        res.json(customCrops);
    } catch (error) {
        console.error('Error fetching custom crops for system:', error);
        res.status(500).json({ error: 'Failed to fetch custom crops' });
    }
});

module.exports = router;