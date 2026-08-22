const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

// The signed-in user's saved fertiliser list (null if they haven't customised).
router.get('/products', authenticateToken, async (req, res) => {
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute('SELECT products FROM user_dosing_products WHERE user_id = ?', [req.user.userId]);
        if (rows.length === 0) return res.json({ products: null });
        let products = null;
        try { products = JSON.parse(rows[0].products); } catch { products = null; }
        res.json({ products });
    } catch (error) {
        console.error('Failed to load dosing products:', error);
        res.status(500).json({ error: 'Failed to load fertilisers' });
    }
});

// Replace the user's saved fertiliser list.
router.put('/products', authenticateToken, async (req, res) => {
    try {
        const { products } = req.body;
        if (!Array.isArray(products)) return res.status(400).json({ error: 'products must be an array' });
        // Keep only the expected shape, cap the size.
        const clean = products.slice(0, 100).map((p) => ({
            name: String(p.name || '').slice(0, 120),
            n: Number(p.n) || 0, p: Number(p.p) || 0, k: Number(p.k) || 0,
            ca: Number(p.ca) || 0, mg: Number(p.mg) || 0, fe: Number(p.fe) || 0,
        })).filter((p) => p.name);
        const pool = getDatabase();
        await pool.execute(
            'INSERT INTO user_dosing_products (user_id, products) VALUES (?, ?) ON DUPLICATE KEY UPDATE products = VALUES(products)',
            [req.user.userId, JSON.stringify(clean)]
        );
        res.json({ success: true, products: clean });
    } catch (error) {
        console.error('Failed to save dosing products:', error);
        res.status(500).json({ error: 'Failed to save fertilisers' });
    }
});

module.exports = router;
