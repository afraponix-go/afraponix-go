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

const RATE_UNIT_SET = ['ml', 'g', 'L', 'kg'];
const dpRow = (r) => ({
    id: r.id, name: r.name,
    n: Number(r.n) || 0, p: Number(r.p) || 0, k: Number(r.k) || 0,
    ca: Number(r.ca) || 0, mg: Number(r.mg) || 0, fe: Number(r.fe) || 0,
    rate_amount: r.rate_amount, rate_unit: r.rate_unit, rate_per_volume: r.rate_per_volume,
});

// The signed-in user's fertiliser catalogue (null if they have none, so the
// calculator falls back to its built-in defaults). Rows now, from dosing_products.
router.get('/products', authenticateToken, async (req, res) => {
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute(
            'SELECT id, name, n, p, k, ca, mg, fe, rate_amount, rate_unit, rate_per_volume FROM dosing_products WHERE user_id = ? ORDER BY name',
            [req.user.userId]
        );
        res.json({ products: rows.length ? rows.map(dpRow) : null });
    } catch (error) {
        console.error('Failed to load dosing products:', error);
        res.status(500).json({ error: 'Failed to load fertilisers' });
    }
});

// Replace the user's fertiliser list (the calculator sends the whole list on any
// change). Upsert by name so an existing fertiliser's structured dose — which the
// calculator doesn't send — is PRESERVED; rows dropped from the list are removed.
router.put('/products', authenticateToken, async (req, res) => {
    try {
        const { products } = req.body;
        if (!Array.isArray(products)) return res.status(400).json({ error: 'products must be an array' });
        const clean = products.slice(0, 100).map((pr) => ({
            name: String(pr.name || '').slice(0, 120),
            n: Number(pr.n) || 0, p: Number(pr.p) || 0, k: Number(pr.k) || 0,
            ca: Number(pr.ca) || 0, mg: Number(pr.mg) || 0, fe: Number(pr.fe) || 0,
        })).filter((pr) => pr.name);
        const pool = getDatabase();
        for (const pr of clean) {
            await pool.execute(
                `INSERT INTO dosing_products (user_id, name, n, p, k, ca, mg, fe) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE n=VALUES(n), p=VALUES(p), k=VALUES(k), ca=VALUES(ca), mg=VALUES(mg), fe=VALUES(fe)`,
                [req.user.userId, pr.name, pr.n, pr.p, pr.k, pr.ca, pr.mg, pr.fe]
            );
        }
        const names = clean.map((pr) => pr.name);
        if (names.length) {
            await pool.query(
                `DELETE FROM dosing_products WHERE user_id = ? AND name NOT IN (${names.map(() => '?').join(',')})`,
                [req.user.userId, ...names]
            );
        } else {
            await pool.execute('DELETE FROM dosing_products WHERE user_id = ?', [req.user.userId]);
        }
        res.json({ success: true, products: clean });
    } catch (error) {
        console.error('Failed to save dosing products:', error);
        res.status(500).json({ error: 'Failed to save fertilisers' });
    }
});

// Add (or update) a single fertiliser, WITH its structured dose + nutrient
// content — used by the "add new fertiliser" flow in the dosing programme builder.
router.post('/products', authenticateToken, async (req, res) => {
    try {
        const b = req.body || {};
        const name = String(b.name || '').trim().slice(0, 120);
        if (!name) return res.status(400).json({ error: 'name is required' });
        const rUnit = RATE_UNIT_SET.includes(b.rate_unit) ? b.rate_unit : null;
        const pool = getDatabase();
        await pool.execute(
            `INSERT INTO dosing_products (user_id, name, n, p, k, ca, mg, fe, rate_amount, rate_unit, rate_per_volume)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE n=VALUES(n), p=VALUES(p), k=VALUES(k), ca=VALUES(ca), mg=VALUES(mg), fe=VALUES(fe),
               rate_amount=VALUES(rate_amount), rate_unit=VALUES(rate_unit), rate_per_volume=VALUES(rate_per_volume)`,
            [req.user.userId, name, numOrNull(b.n), numOrNull(b.p), numOrNull(b.k), numOrNull(b.ca), numOrNull(b.mg), numOrNull(b.fe),
             numOrNull(b.rate_amount), rUnit, numOrNull(b.rate_per_volume)]
        );
        const [rows] = await pool.execute(
            'SELECT id, name, n, p, k, ca, mg, fe, rate_amount, rate_unit, rate_per_volume FROM dosing_products WHERE user_id = ? AND name = ?',
            [req.user.userId, name]
        );
        res.json({ success: true, product: rows.length ? dpRow(rows[0]) : null });
    } catch (error) {
        console.error('Failed to add dosing product:', error);
        res.status(500).json({ error: 'Failed to add fertiliser' });
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

// ---------------------------------------------------- dashboard scoring

const slug = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const prettyName = (code) => String(code || '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// Default targets AND floors (min_value) for a crop + stage, veg -> general
// fallback. Returns { n:{target,floor}, ... } or null.
async function defaultTargetsFull(pool, cropCode, stage) {
    const read = async (stageCode) => {
        const [rows] = await pool.execute(
            `SELECT n.code AS nutrient, cnt.target_value AS val, cnt.min_value AS floor
             FROM crop_nutrient_targets cnt
             JOIN crops c ON c.id = cnt.crop_id
             JOIN nutrients n ON n.id = cnt.nutrient_id
             JOIN growth_stages gs ON gs.id = cnt.growth_stage_id
             WHERE c.code = ? AND gs.code = ?`,
            [cropCode, stageCode]
        );
        if (rows.length === 0) return null;
        const out = {};
        for (const k of KEYS) out[k] = { target: null, floor: null };
        for (const r of rows) { const key = KEY_BY_NUTRIENT[r.nutrient]; if (key) out[key] = { target: numOrNull(r.val), floor: numOrNull(r.floor) }; }
        return out;
    };
    let out = await read(stage);
    if (!out && stage === 'vegetative') out = await read('general');
    return out;
}

// Effective target + floor per nutrient for one crop + stage in a system:
// override (aim) over default (aim), with the floor always from the default.
async function cropBand(pool, systemId, userId, cropCode, stage) {
    let def = await defaultTargetsFull(pool, cropCode, stage);
    if (!def && stage === 'vegetative') {
        const cc = await customCropTargets(pool, userId, cropCode);
        if (cc) { def = {}; for (const k of KEYS) def[k] = { target: cc[k], floor: null }; }
    }
    const ov = await systemOverride(pool, systemId, cropCode, stage);
    const out = {};
    for (const k of KEYS) {
        const target = (ov && ov[k] != null) ? ov[k] : (def ? def[k].target : null);
        let floor = def ? def[k].floor : null;
        if (floor == null && target != null) floor = Math.round(target * 0.8 * 10) / 10;
        out[k] = { target, floor };
    }
    return out;
}

async function inSystemCropTypes(pool, systemId) {
    const [a] = await pool.execute('SELECT DISTINCT crop_type FROM plant_allocations WHERE system_id = ?', [systemId]);
    const [g] = await pool.execute("SELECT DISTINCT crop_type FROM plant_growth WHERE system_id = ? AND crop_type IS NOT NULL AND crop_type <> ''", [systemId]);
    const set = new Set();
    for (const r of [...a, ...g]) if (r.crop_type) set.add(slug(r.crop_type));
    return [...set];
}

async function fruitingCropTypes(pool, systemId) {
    const [rows] = await pool.execute(
        "SELECT DISTINCT crop_type FROM plant_growth WHERE system_id = ? AND LOWER(growth_stage) IN ('flowering','fruiting','harvest','harvest_ready')",
        [systemId]
    );
    const set = new Set();
    for (const r of rows) if (r.crop_type) set.add(slug(r.crop_type));
    return set;
}

async function cropNameMap(pool, userId, codes) {
    const map = {};
    if (!codes.length) return map;
    const [globals] = await pool.query('SELECT code, name FROM crops WHERE code IN (?)', [codes]);
    for (const r of globals) map[r.code] = r.name;
    const [customs] = await pool.query('SELECT crop_code, crop_name FROM custom_crops WHERE user_id = ? AND crop_code IN (?)', [userId, codes]);
    for (const r of customs) if (!map[r.crop_code]) map[r.crop_code] = r.crop_name;
    return map;
}

// Per-nutrient target bands the dashboard scores readings against. Either the
// system's pinned primary crop+stage, or (default) the most-demanding levels
// across the crops planted in the system, each judged at its current stage.
router.get('/system-nutrient-targets/:systemId', authenticateToken, async (req, res) => {
    try {
        const { systemId } = req.params;
        const pool = getDatabase();
        if (!(await ownsSystem(pool, systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });

        // Selectable crops = the ones planted in this system (with stage info).
        const inSystem = await inSystemCropTypes(pool, systemId);
        const nameMap = await cropNameMap(pool, req.user.userId, inSystem);
        const options = [];
        for (const code of inSystem) {
            const stages = await cropStages(pool, code);
            options.push({ code, name: nameMap[code] || prettyName(code), hasFruiting: stages.includes('fruiting') });
        }
        options.sort((a, b) => a.name.localeCompare(b.name));

        const [primaryRows] = await pool.execute('SELECT crop_code, stage FROM system_target_crop WHERE system_id = ?', [systemId]);
        const primary = primaryRows.length ? { crop: primaryRows[0].crop_code, stage: primaryRows[0].stage } : null;

        // Which crop+stage pairs to score against.
        let toScore = [];
        if (primary) {
            toScore = [{ code: primary.crop, stage: primary.stage }];
        } else {
            const fruiting = await fruitingCropTypes(pool, systemId);
            for (const opt of options) {
                const stage = fruiting.has(opt.code) && opt.hasFruiting ? 'fruiting' : 'vegetative';
                toScore.push({ code: opt.code, stage });
            }
        }

        // Aggregate: per nutrient, the highest floor and highest target win.
        const bands = {};
        for (const k of KEYS) bands[k] = null;
        for (const { code, stage } of toScore) {
            const band = await cropBand(pool, systemId, req.user.userId, code, stage);
            for (const k of KEYS) {
                const { target, floor } = band[k];
                if (target == null && floor == null) continue;
                const cur = bands[k] || { floor: null, target: null };
                if (target != null) cur.target = cur.target == null ? target : Math.max(cur.target, target);
                if (floor != null) cur.floor = cur.floor == null ? floor : Math.max(cur.floor, floor);
                bands[k] = cur;
            }
        }
        for (const k of KEYS) {
            if (bands[k] && bands[k].target != null) bands[k].high = Math.round(bands[k].target * 1.5 * 10) / 10;
        }

        res.json({ mode: primary ? 'primary' : 'auto', primary, bands, options });
    } catch (error) {
        console.error('Failed to load system nutrient targets:', error);
        res.status(500).json({ error: 'Failed to load system nutrient targets' });
    }
});

// Pin (or clear) the system's primary reference crop for dashboard scoring.
router.put('/system-nutrient-targets/:systemId', authenticateToken, async (req, res) => {
    try {
        const { systemId } = req.params;
        const pool = getDatabase();
        if (!(await ownsSystem(pool, systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });

        const crop = req.body && req.body.crop ? String(req.body.crop).slice(0, 50) : null;
        if (!crop) {
            await pool.execute('DELETE FROM system_target_crop WHERE system_id = ?', [systemId]);
            return res.json({ success: true, primary: null });
        }
        const stage = validStage(req.body && req.body.stage) ? req.body.stage : 'vegetative';
        await pool.execute(
            'INSERT INTO system_target_crop (system_id, crop_code, stage) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE crop_code = VALUES(crop_code), stage = VALUES(stage)',
            [systemId, crop, stage]
        );
        res.json({ success: true, primary: { crop, stage } });
    } catch (error) {
        console.error('Failed to set system reference crop:', error);
        res.status(500).json({ error: 'Failed to set reference crop' });
    }
});

// ---------------------------------------------------- dosing programmes

// A dosing programme is target-band maintenance: one or more nutrient targets to
// hold, on a test cadence (weekdays). It lives in the unified `programmes` /
// `programme_items` tables as type='dosing'; each target is an item carrying the
// nutrient + target value + preferred fertiliser name + the test weekdays.
const WEEKDAYS_LIST = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

async function ownedDosingProgramme(pool, id, userId) {
    const [rows] = await pool.execute(
        "SELECT p.* FROM programmes p JOIN systems s ON s.id = p.system_id WHERE p.id = ? AND p.type = 'dosing' AND s.user_id = ?",
        [id, userId]
    );
    return rows.length ? rows[0] : null;
}

async function dosingTargets(pool, programmeId) {
    const [rows] = await pool.execute(
        `SELECT id, target_nutrient AS nutrient, target_value, label AS product, weekdays
         FROM programme_items WHERE programme_id = ? AND target_nutrient IS NOT NULL
         ORDER BY sort_order, id`,
        [programmeId]
    );
    return rows.map((r) => ({ id: r.id, nutrient: r.nutrient, target_value: r.target_value, product: r.product, days: r.weekdays ? r.weekdays.split(',').filter(Boolean) : [] }));
}

async function replaceDosingTargets(pool, programmeId, targets) {
    await pool.execute('DELETE FROM programme_items WHERE programme_id = ? AND target_nutrient IS NOT NULL', [programmeId]);
    let order = 0;
    for (const t of targets || []) {
        if (!t || !KEYS.includes(t.nutrient)) continue;
        const days = Array.isArray(t.days) ? t.days.filter((d) => WEEKDAYS_LIST.includes(d)).join(',') : '';
        await pool.execute(
            "INSERT INTO programme_items (programme_id, target_nutrient, target_value, label, schedule_kind, weekdays, sort_order) VALUES (?, ?, ?, ?, 'weekdays', ?, ?)",
            [programmeId, t.nutrient, numOrNull(t.target_value), (String(t.product || '').slice(0, 120)) || null, days, order++]
        );
    }
}

router.get('/programmes/:systemId', authenticateToken, async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await ownsSystem(pool, req.params.systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });
        const [progs] = await pool.execute(
            "SELECT id, system_id, name, notes, status, created_at FROM programmes WHERE system_id = ? AND type = 'dosing' ORDER BY status, created_at DESC",
            [req.params.systemId]
        );
        const out = [];
        for (const p of progs) out.push({ ...p, targets: await dosingTargets(pool, p.id) });
        res.json({ programmes: out });
    } catch (error) {
        console.error('Failed to load dosing programmes:', error);
        res.status(500).json({ error: 'Failed to load dosing programmes' });
    }
});

router.post('/programmes/:systemId', authenticateToken, async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await ownsSystem(pool, req.params.systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });
        const b = req.body || {};
        if (!b.name) return res.status(400).json({ error: 'name is required' });
        const [result] = await pool.execute(
            "INSERT INTO programmes (system_id, type, name, notes, status) VALUES (?, 'dosing', ?, ?, ?)",
            [req.params.systemId, String(b.name).slice(0, 255), b.notes || null, b.status === 'paused' ? 'paused' : 'active']
        );
        await replaceDosingTargets(pool, result.insertId, b.targets);
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Failed to create dosing programme:', error);
        res.status(500).json({ error: 'Failed to create dosing programme' });
    }
});

router.put('/programmes/:id', authenticateToken, async (req, res) => {
    try {
        const pool = getDatabase();
        const prog = await ownedDosingProgramme(pool, req.params.id, req.user.userId);
        if (!prog) return res.status(404).json({ error: 'Programme not found or access denied' });
        const b = req.body || {};
        await pool.execute(
            'UPDATE programmes SET name=?, notes=?, status=? WHERE id=?',
            [String(b.name ?? prog.name).slice(0, 255), b.notes ?? prog.notes, b.status === 'paused' ? 'paused' : 'active', req.params.id]
        );
        if (Array.isArray(b.targets)) await replaceDosingTargets(pool, Number(req.params.id), b.targets);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update dosing programme:', error);
        res.status(500).json({ error: 'Failed to update dosing programme' });
    }
});

router.delete('/programmes/:id', authenticateToken, async (req, res) => {
    try {
        const pool = getDatabase();
        const prog = await ownedDosingProgramme(pool, req.params.id, req.user.userId);
        if (!prog) return res.status(404).json({ error: 'Programme not found or access denied' });
        await pool.execute('DELETE FROM programmes WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete dosing programme:', error);
        res.status(500).json({ error: 'Failed to delete dosing programme' });
    }
});

module.exports = router;
