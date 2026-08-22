const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin-auth');
const { CROP_ANCHORS, computeTargets } = require('../database/nutrient-target-model');

// nutrient key <-> nutrients.code
const KEYS = ['n', 'p', 'k', 'ca', 'mg', 'fe'];
const NUTRIENT_BY_KEY = { n: 'nitrogen', p: 'phosphorus', k: 'potassium', ca: 'calcium', mg: 'magnesium', fe: 'iron' };
const KEY_BY_NUTRIENT = { nitrogen: 'n', phosphorus: 'p', potassium: 'k', calcium: 'ca', magnesium: 'mg', iron: 'fe' };

// ------------------------------------------------------------------ products

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

// ------------------------------------------------------------------ helpers

// Recommended targets straight from the ratio model (null if the crop/stage is
// not in the model). Used to seed edits and to "reset to recommended".
function recommendedTargets(cropCode, stage) {
    const entry = CROP_ANCHORS.find((a) => a.code === cropCode && a.stage === stage);
    if (!entry) return null;
    const t = computeTargets(entry.anchorN, stage);
    const out = {};
    for (const k of KEYS) out[k] = t[NUTRIENT_BY_KEY[k]].target;
    return out;
}

// Global default targets from crop_nutrient_targets for a crop + stage. Falls
// back to the legacy 'general' stage for the vegetative request so pre-stage
// data still resolves. Returns { n..fe } (missing nutrients null) or null.
async function defaultTargets(pool, cropCode, stage) {
    const read = async (stageCode) => {
        const [rows] = await pool.execute(
            `SELECT n.code AS nutrient, cnt.target_value AS val
             FROM crop_nutrient_targets cnt
             JOIN crops c ON c.id = cnt.crop_id
             JOIN nutrients n ON n.id = cnt.nutrient_id
             JOIN growth_stages gs ON gs.id = cnt.growth_stage_id
             WHERE c.code = ? AND gs.code = ?`,
            [cropCode, stageCode]
        );
        if (rows.length === 0) return null;
        const out = { n: null, p: null, k: null, ca: null, mg: null, fe: null };
        for (const r of rows) { const key = KEY_BY_NUTRIENT[r.nutrient]; if (key) out[key] = Number(r.val); }
        return out;
    };
    let out = await read(stage);
    if (!out && stage === 'vegetative') out = await read('general');
    return out;
}

// Fallback for user-added crops that have no global default: their inline
// custom_crops.target_* (per-user, single stage). Only meaningful for the
// vegetative/leafy stage.
async function customCropTargets(pool, userId, cropCode) {
    const [rows] = await pool.execute(
        'SELECT target_n, target_p, target_k, target_ca, target_mg, target_fe FROM custom_crops WHERE user_id = ? AND crop_code = ? LIMIT 1',
        [userId, cropCode]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    const out = { n: numOrNull(r.target_n), p: numOrNull(r.target_p), k: numOrNull(r.target_k), ca: numOrNull(r.target_ca), mg: numOrNull(r.target_mg), fe: numOrNull(r.target_fe) };
    return KEYS.some((k) => out[k] != null) ? out : null;
}

async function systemOverride(pool, systemId, cropCode, stage) {
    const [rows] = await pool.execute(
        'SELECT target_n, target_p, target_k, target_ca, target_mg, target_fe FROM system_crop_targets WHERE system_id = ? AND crop_code = ? AND stage = ?',
        [systemId, cropCode, stage]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return { n: numOrNull(r.target_n), p: numOrNull(r.target_p), k: numOrNull(r.target_k), ca: numOrNull(r.target_ca), mg: numOrNull(r.target_mg), fe: numOrNull(r.target_fe) };
}

const numOrNull = (v) => (v == null ? null : Number(v));

// Does this crop carry a fruiting stage (model or stored default)?
async function cropStages(pool, cropCode) {
    if (recommendedTargets(cropCode, 'fruiting')) return ['vegetative', 'fruiting'];
    const [rows] = await pool.execute(
        `SELECT 1 FROM crop_nutrient_targets cnt
         JOIN crops c ON c.id = cnt.crop_id
         JOIN growth_stages gs ON gs.id = cnt.growth_stage_id
         WHERE c.code = ? AND gs.code = 'fruiting' LIMIT 1`,
        [cropCode]
    );
    return rows.length ? ['vegetative', 'fruiting'] : ['vegetative'];
}

async function ownsSystem(pool, systemId, userId) {
    const [rows] = await pool.execute('SELECT 1 FROM systems WHERE id = ? AND user_id = ?', [systemId, userId]);
    return rows.length > 0;
}

function sanitizeTargets(body) {
    const t = (body && body.targets) || {};
    const out = {};
    for (const k of KEYS) {
        const v = t[k];
        out[k] = v === '' || v == null ? null : (Number.isFinite(Number(v)) ? Number(v) : null);
    }
    return out;
}

function validStage(s) { return s === 'vegetative' || s === 'fruiting'; }

// ------------------------------------------------------------------ targets

// Effective targets for a system + crop + stage, resolving override -> default,
// plus the raw default and recommended (ratio) values so the editor can show
// what a reset would restore. Also reports the crop's available stages.
router.get('/targets/:systemId/:cropCode', authenticateToken, async (req, res) => {
    try {
        const { systemId, cropCode } = req.params;
        const stage = validStage(req.query.stage) ? req.query.stage : 'vegetative';
        const pool = getDatabase();
        if (!(await ownsSystem(pool, systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });

        let def = await defaultTargets(pool, cropCode, stage);
        if (!def && stage === 'vegetative') def = await customCropTargets(pool, req.user.userId, cropCode);
        const ov = await systemOverride(pool, systemId, cropCode, stage);
        const recommended = recommendedTargets(cropCode, stage);
        const stages = await cropStages(pool, cropCode);

        let effective = null;
        let source = 'none';
        if (ov || def) {
            effective = {};
            for (const k of KEYS) effective[k] = (ov && ov[k] != null) ? ov[k] : (def ? def[k] : null);
            source = ov ? 'system' : 'default';
        }
        res.json({ stage, stages, effective, source, hasOverride: !!ov, default: def, recommended });
    } catch (error) {
        console.error('Failed to load crop targets:', error);
        res.status(500).json({ error: 'Failed to load crop targets' });
    }
});

// Save a per-system override for a crop + stage.
router.put('/targets/:systemId/:cropCode', authenticateToken, async (req, res) => {
    try {
        const { systemId, cropCode } = req.params;
        const stage = validStage(req.body && req.body.stage) ? req.body.stage : 'vegetative';
        const pool = getDatabase();
        if (!(await ownsSystem(pool, systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });

        const t = sanitizeTargets(req.body);
        await pool.execute(
            `INSERT INTO system_crop_targets (system_id, crop_code, stage, target_n, target_p, target_k, target_ca, target_mg, target_fe)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE target_n = VALUES(target_n), target_p = VALUES(target_p), target_k = VALUES(target_k),
               target_ca = VALUES(target_ca), target_mg = VALUES(target_mg), target_fe = VALUES(target_fe)`,
            [systemId, cropCode.slice(0, 50), stage, t.n, t.p, t.k, t.ca, t.mg, t.fe]
        );
        res.json({ success: true, targets: t });
    } catch (error) {
        console.error('Failed to save system crop target:', error);
        res.status(500).json({ error: 'Failed to save crop target override' });
    }
});

// Remove a per-system override (revert that crop + stage to the default).
router.delete('/targets/:systemId/:cropCode', authenticateToken, async (req, res) => {
    try {
        const { systemId, cropCode } = req.params;
        const stage = validStage(req.query.stage) ? req.query.stage : 'vegetative';
        const pool = getDatabase();
        if (!(await ownsSystem(pool, systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });
        await pool.execute('DELETE FROM system_crop_targets WHERE system_id = ? AND crop_code = ? AND stage = ?', [systemId, cropCode, stage]);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete system crop target:', error);
        res.status(500).json({ error: 'Failed to reset crop target override' });
    }
});

// Admin: edit the GLOBAL default targets (crop_nutrient_targets) for a crop +
// stage. Writes the six elemental targets directly. requireAdmin verifies JWT.
router.put('/admin/targets/:cropCode', requireAdmin, async (req, res) => {
    try {
        const { cropCode } = req.params;
        const stage = validStage(req.body && req.body.stage) ? req.body.stage : 'vegetative';
        const pool = getDatabase();

        const [crops] = await pool.execute('SELECT id FROM crops WHERE code = ?', [cropCode]);
        if (crops.length === 0) return res.status(404).json({ error: 'Crop not found' });
        const cropId = crops[0].id;
        const [stageRows] = await pool.execute('SELECT id FROM growth_stages WHERE code = ?', [stage]);
        if (stageRows.length === 0) return res.status(400).json({ error: 'Unknown stage' });
        const stageId = stageRows[0].id;

        const t = sanitizeTargets(req.body);
        for (const k of KEYS) {
            if (t[k] == null) continue; // leave a nutrient untouched if blank
            const [nutRows] = await pool.execute('SELECT id FROM nutrients WHERE code = ?', [NUTRIENT_BY_KEY[k]]);
            if (nutRows.length === 0) continue;
            await pool.execute(
                `INSERT INTO crop_nutrient_targets (crop_id, nutrient_id, growth_stage_id, target_value)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE target_value = VALUES(target_value)`,
                [cropId, nutRows[0].id, stageId, t[k]]
            );
        }
        res.json({ success: true, targets: t });
    } catch (error) {
        console.error('Failed to save default crop target:', error);
        res.status(500).json({ error: 'Failed to save default crop target' });
    }
});

module.exports = router;
