const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { CATEGORY_DEFAULT_DAYS, SPRAY_CATEGORIES } = require('../database/spray-catalog');

router.use(authenticateToken);

const slug = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

async function ownsSystem(pool, systemId, userId) {
    const [rows] = await pool.execute('SELECT 1 FROM systems WHERE id = ? AND user_id = ?', [systemId, userId]);
    return rows.length > 0;
}

// Verify the caller owns the system a plan belongs to; returns the plan row or null.
async function ownedPlan(pool, planId, userId) {
    const [rows] = await pool.execute(
        'SELECT p.* FROM spray_plans p JOIN systems s ON s.id = p.system_id WHERE p.id = ? AND s.user_id = ?',
        [planId, userId]
    );
    return rows.length ? rows[0] : null;
}

async function planProducts(pool, planId) {
    const [rows] = await pool.execute(
        `SELECT spp.id, spp.product_id, spp.rate, spp.days,
                p.product_name, p.category, p.fish_safety, p.fish_note, p.default_rate, p.interval_days, p.active_ingredient, p.target
         FROM spray_plan_products spp JOIN spray_products p ON p.id = spp.product_id
         WHERE spp.plan_id = ? ORDER BY p.category, p.product_name`,
        [planId]
    );
    return rows.map((r) => ({ ...r, days: r.days ? r.days.split(',').filter(Boolean) : [] }));
}

// ------------------------------------------------------------- catalog

router.get('/categories', (req, res) => res.json({ categories: SPRAY_CATEGORIES, defaultDays: CATEGORY_DEFAULT_DAYS }));

// Global catalog + this user's custom products.
router.get('/products', async (req, res) => {
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute(
            'SELECT * FROM spray_products WHERE is_active = 1 AND (user_id IS NULL OR user_id = ?) ORDER BY category, product_name',
            [req.user.userId]
        );
        res.json({ products: rows.map((r) => ({ ...r, custom: r.user_id != null })) });
    } catch (error) {
        console.error('Failed to load spray products:', error);
        res.status(500).json({ error: 'Failed to load products' });
    }
});

router.post('/products', async (req, res) => {
    try {
        const b = req.body || {};
        if (!b.product_name || !b.category) return res.status(400).json({ error: 'product_name and category are required' });
        const pool = getDatabase();
        const base = `u${req.user.userId}_${slug(b.product_name)}`;
        let code = base;
        for (let n = 2; n <= 20; n++) {
            const [exists] = await pool.execute('SELECT 1 FROM spray_products WHERE code = ?', [code]);
            if (exists.length === 0) break;
            code = `${base}_${n}`;
        }
        const fish = ['safe', 'caution', 'toxic'].includes(b.fish_safety) ? b.fish_safety : 'caution';
        const [result] = await pool.execute(
            `INSERT INTO spray_products (code, user_id, category, product_name, active_ingredient, target, default_rate, interval_days, fish_safety, fish_note, compatibility_notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [code, req.user.userId, String(b.category).slice(0, 40), String(b.product_name).slice(0, 255), b.active_ingredient || null, b.target || null,
             b.default_rate || null, b.interval_days ? Number(b.interval_days) : null, fish, b.fish_note || null, b.compatibility_notes || null]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Failed to add spray product:', error);
        res.status(500).json({ error: 'Failed to add product' });
    }
});

router.put('/products/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute('SELECT user_id FROM spray_products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        if (rows[0].user_id !== req.user.userId) return res.status(403).json({ error: 'Only your own products can be edited' });
        const b = req.body || {};
        const fish = ['safe', 'caution', 'toxic'].includes(b.fish_safety) ? b.fish_safety : 'caution';
        await pool.execute(
            `UPDATE spray_products SET category=?, product_name=?, active_ingredient=?, target=?, default_rate=?, interval_days=?, fish_safety=?, fish_note=?, compatibility_notes=? WHERE id=?`,
            [String(b.category || '').slice(0, 40), String(b.product_name || '').slice(0, 255), b.active_ingredient || null, b.target || null,
             b.default_rate || null, b.interval_days ? Number(b.interval_days) : null, fish, b.fish_note || null, b.compatibility_notes || null, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update spray product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

router.delete('/products/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute('SELECT user_id FROM spray_products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        if (rows[0].user_id !== req.user.userId) return res.status(403).json({ error: 'Only your own products can be deleted' });
        await pool.execute('DELETE FROM spray_products WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete spray product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// ------------------------------------------------------------- programmes (plans)

async function replacePlanProducts(pool, planId, products) {
    await pool.execute('DELETE FROM spray_plan_products WHERE plan_id = ?', [planId]);
    for (const p of products || []) {
        if (!p || !p.product_id) continue;
        const days = Array.isArray(p.days) ? p.days.filter((d) => WEEKDAYS.includes(d)).join(',') : (typeof p.days === 'string' ? p.days : '');
        await pool.execute(
            'INSERT IGNORE INTO spray_plan_products (plan_id, product_id, rate, days) VALUES (?, ?, ?, ?)',
            [planId, Number(p.product_id), p.rate || null, days]
        );
    }
}

router.get('/programmes/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await ownsSystem(pool, req.params.systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });
        const [plans] = await pool.execute(
            `SELECT id, system_id, name, notes, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
                    DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date, status, created_at
             FROM spray_plans WHERE system_id = ? ORDER BY status, created_at DESC`,
            [req.params.systemId]
        );
        const out = [];
        for (const plan of plans) out.push({ ...plan, products: await planProducts(pool, plan.id) });
        res.json({ programmes: out });
    } catch (error) {
        console.error('Failed to load spray programmes:', error);
        res.status(500).json({ error: 'Failed to load programmes' });
    }
});

router.post('/programmes/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await ownsSystem(pool, req.params.systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });
        const b = req.body || {};
        if (!b.name) return res.status(400).json({ error: 'name is required' });
        const [result] = await pool.execute(
            'INSERT INTO spray_plans (system_id, name, notes, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)',
            [req.params.systemId, String(b.name).slice(0, 255), b.notes || null, b.start_date || null, b.end_date || null, b.status === 'inactive' ? 'inactive' : 'active']
        );
        await replacePlanProducts(pool, result.insertId, b.products);
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Failed to create spray programme:', error);
        res.status(500).json({ error: 'Failed to create programme' });
    }
});

router.put('/programmes/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const plan = await ownedPlan(pool, req.params.id, req.user.userId);
        if (!plan) return res.status(404).json({ error: 'Programme not found or access denied' });
        const b = req.body || {};
        await pool.execute(
            'UPDATE spray_plans SET name=?, notes=?, start_date=?, end_date=?, status=? WHERE id=?',
            [String(b.name ?? plan.name).slice(0, 255), b.notes ?? plan.notes, b.start_date ?? plan.start_date, b.end_date ?? plan.end_date,
             b.status === 'inactive' ? 'inactive' : 'active', req.params.id]
        );
        if (Array.isArray(b.products)) await replacePlanProducts(pool, Number(req.params.id), b.products);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update spray programme:', error);
        res.status(500).json({ error: 'Failed to update programme' });
    }
});

router.delete('/programmes/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const plan = await ownedPlan(pool, req.params.id, req.user.userId);
        if (!plan) return res.status(404).json({ error: 'Programme not found or access denied' });
        await pool.execute('DELETE FROM spray_plans WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete spray programme:', error);
        res.status(500).json({ error: 'Failed to delete programme' });
    }
});

// ------------------------------------------------------------- log (applications)

router.get('/log/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await ownsSystem(pool, req.params.systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });
        const limit = Math.min(500, Number(req.query.limit) || 200);
        const [rows] = await pool.query(
            `SELECT l.id, l.system_id, l.plan_id, l.product_id, l.product_name,
                    DATE_FORMAT(l.application_date, '%Y-%m-%d') AS application_date,
                    l.rate, l.amount, l.area, l.dilution, l.weather, l.effectiveness, l.operator, l.notes, l.created_at,
                    pl.name AS plan_name
             FROM spray_log l LEFT JOIN spray_plans pl ON pl.id = l.plan_id
             WHERE l.system_id = ? ORDER BY l.application_date DESC, l.id DESC LIMIT ?`,
            [req.params.systemId, limit]
        );
        res.json({ log: rows });
    } catch (error) {
        console.error('Failed to load spray log:', error);
        res.status(500).json({ error: 'Failed to load spray log' });
    }
});

router.post('/log', async (req, res) => {
    try {
        const b = req.body || {};
        const pool = getDatabase();
        if (!b.system_id || !b.application_date) return res.status(400).json({ error: 'system_id and application_date are required' });
        if (!(await ownsSystem(pool, b.system_id, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });
        // Snapshot the product name so history survives product deletion.
        let productName = b.product_name || null;
        if (!productName && b.product_id) {
            const [pr] = await pool.execute('SELECT product_name FROM spray_products WHERE id = ?', [b.product_id]);
            productName = pr.length ? pr[0].product_name : null;
        }
        const eff = b.effectiveness ? Math.max(1, Math.min(5, Number(b.effectiveness))) : null;
        const [result] = await pool.execute(
            `INSERT INTO spray_log (system_id, plan_id, product_id, product_name, application_date, rate, amount, area, dilution, weather, effectiveness, operator, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [b.system_id, b.plan_id || null, b.product_id || null, productName, b.application_date, b.rate || null, b.amount || null,
             b.area || null, b.dilution || null, b.weather || null, eff, b.operator || null, b.notes || null]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Failed to record spray application:', error);
        res.status(500).json({ error: 'Failed to record application' });
    }
});

router.delete('/log/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute(
            'SELECT l.id FROM spray_log l JOIN systems s ON s.id = l.system_id WHERE l.id = ? AND s.user_id = ?',
            [req.params.id, req.user.userId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found or access denied' });
        await pool.execute('DELETE FROM spray_log WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete spray log entry:', error);
        res.status(500).json({ error: 'Failed to delete log entry' });
    }
});

// ------------------------------------------------------------- schedule

// What's scheduled today (and recently overdue) across the system's active
// programmes, minus what's already been logged today.
router.get('/due/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await ownsSystem(pool, req.params.systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });
        const today = (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) ? req.query.date : new Date().toISOString().slice(0, 10);
        const todayDow = WEEKDAYS[new Date(today + 'T00:00:00').getDay()];

        const [plans] = await pool.execute("SELECT * FROM spray_plans WHERE system_id = ? AND status = 'active'", [req.params.systemId]);
        const [loggedToday] = await pool.execute('SELECT product_id FROM spray_log WHERE system_id = ? AND application_date = ?', [req.params.systemId, today]);
        const doneSet = new Set(loggedToday.map((r) => r.product_id));

        const due = [];
        for (const plan of plans) {
            const products = await planProducts(pool, plan.id);
            for (const p of products) {
                if (!p.days.includes(todayDow)) continue;
                due.push({
                    plan_id: plan.id, plan_name: plan.name, product_id: p.product_id, product_name: p.product_name,
                    category: p.category, fish_safety: p.fish_safety, fish_note: p.fish_note, rate: p.rate || p.default_rate,
                    done: doneSet.has(p.product_id),
                });
            }
        }
        res.json({ date: today, due });
    } catch (error) {
        console.error('Failed to load due sprays:', error);
        res.status(500).json({ error: 'Failed to load due sprays' });
    }
});

// Month grid of scheduled sprays derived from each product's weekdays, with
// applied markers from the log.
router.get('/calendar/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await ownsSystem(pool, req.params.systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });
        const now = new Date();
        const year = Number(req.query.year) || now.getFullYear();
        const month = Number(req.query.month) || (now.getMonth() + 1); // 1-12
        const daysInMonth = new Date(year, month, 0).getDate();
        const mm = String(month).padStart(2, '0');
        const from = `${year}-${mm}-01`;
        const to = `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`;

        const [plans] = await pool.execute("SELECT * FROM spray_plans WHERE system_id = ? AND status = 'active'", [req.params.systemId]);
        const planProds = {};
        for (const plan of plans) planProds[plan.id] = await planProducts(pool, plan.id);
        const [applied] = await pool.execute("SELECT DATE_FORMAT(application_date, '%Y-%m-%d') AS application_date, product_id FROM spray_log WHERE system_id = ? AND application_date BETWEEN ? AND ?", [req.params.systemId, from, to]);
        const appliedSet = new Set(applied.map((r) => `${r.application_date}|${r.product_id}`));

        const days = {};
        for (let d = 1; d <= daysInMonth; d++) {
            const date = `${year}-${mm}-${String(d).padStart(2, '0')}`;
            const dow = WEEKDAYS[new Date(date + 'T00:00:00').getDay()];
            const items = [];
            for (const plan of plans) {
                for (const p of planProds[plan.id]) {
                    if (!p.days.includes(dow)) continue;
                    items.push({ plan_name: plan.name, product_name: p.product_name, category: p.category, fish_safety: p.fish_safety, applied: appliedSet.has(`${date}|${p.product_id}`) });
                }
            }
            if (items.length) days[date] = items;
        }
        res.json({ year, month, days });
    } catch (error) {
        console.error('Failed to load spray calendar:', error);
        res.status(500).json({ error: 'Failed to load spray calendar' });
    }
});

module.exports = router;
