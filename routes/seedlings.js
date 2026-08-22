const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

async function ownsSystem(pool, systemId, userId) {
    const [rows] = await pool.execute('SELECT user_id FROM systems WHERE id = ? AND user_id = ?', [systemId, userId]);
    return rows.length > 0;
}
async function ownedSeedling(pool, id, userId) {
    const [rows] = await pool.execute(
        'SELECT sb.* FROM seedling_batches sb JOIN systems s ON s.id = sb.system_id WHERE sb.id = ? AND s.user_id = ?',
        [id, userId]
    );
    return rows.length ? rows[0] : null;
}
const numOrNull = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
const intOrNull = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v)));

// Parse the stored tray groups (mixed sizes) or fall back to single trays×cells,
// returning the normalized groups and the total seeds sown.
function trayInfo(row) {
    let groups = null;
    try { groups = row.tray_groups ? JSON.parse(row.tray_groups) : null; } catch { groups = null; }
    if (!Array.isArray(groups) || groups.length === 0) groups = [{ trays: Number(row.trays) || 0, cells: Number(row.cells_per_tray) || 0 }];
    groups = groups.map((g) => ({ trays: Math.max(0, Math.round(Number(g.trays) || 0)), cells: Math.max(0, Math.round(Number(g.cells) || 0)) })).filter((g) => g.trays > 0 && g.cells > 0);
    const total = groups.reduce((s, g) => s + g.trays * g.cells, 0);
    return { groups, total };
}

// Derive the stored columns from an optional tray_groups input array.
function trayFieldsFrom(trayGroups, fallbackTrays, fallbackCells) {
    let groups = Array.isArray(trayGroups) ? trayGroups : null;
    groups = (groups || []).map((g) => ({ trays: Math.max(0, Math.round(Number(g.trays) || 0)), cells: Math.max(0, Math.round(Number(g.cells) || 0)) })).filter((g) => g.trays > 0 && g.cells > 0);
    if (groups.length === 0) {
        return { json: null, trays: Math.max(1, intOrNull(fallbackTrays) || 1), cells: Math.max(1, intOrNull(fallbackCells) || 128) };
    }
    return { json: JSON.stringify(groups), trays: groups.reduce((s, g) => s + g.trays, 0), cells: groups.length === 1 ? groups[0].cells : null };
}

const SELECT_COLS = `
  id, system_id, crop_code, crop_name, seed_variety,
  DATE_FORMAT(sow_date, '%Y-%m-%d') AS sow_date, trays, cells_per_tray, tray_groups,
  predicted_germ_days, predicted_transplant_days,
  DATE_FORMAT(germination_date, '%Y-%m-%d') AS germination_date, germinated_count,
  DATE_FORMAT(transplant_date, '%Y-%m-%d') AS transplant_date, transplanted_count,
  grow_bed_id, plant_batch_id, status, notes,
  DATEDIFF(germination_date, sow_date) AS actual_germ_days,
  DATE_FORMAT(DATE_ADD(sow_date, INTERVAL predicted_transplant_days DAY), '%Y-%m-%d') AS predicted_transplant_date,
  DATEDIFF(DATE_ADD(sow_date, INTERVAL predicted_transplant_days DAY), CURDATE()) AS days_to_transplant_remaining,
  DATEDIFF(transplant_date, sow_date) AS actual_transplant_days`;

router.get('/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await ownsSystem(pool, req.params.systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });
        const [rows] = await pool.execute(
            `SELECT ${SELECT_COLS} FROM seedling_batches WHERE system_id = ? ORDER BY (status = 'transplanted'), sow_date DESC, id DESC`,
            [req.params.systemId]
        );
        const seedlings = rows.map((r) => { const t = trayInfo(r); return { ...r, tray_groups: t.groups, total_sown: t.total }; });
        res.json({ seedlings });
    } catch (error) {
        console.error('Failed to load seedlings:', error);
        res.status(500).json({ error: 'Failed to load seedlings' });
    }
});

router.post('/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await ownsSystem(pool, req.params.systemId, req.user.userId))) return res.status(404).json({ error: 'System not found or access denied' });
        const b = req.body || {};
        if (!b.sow_date) return res.status(400).json({ error: 'sow_date is required' });
        const tf = trayFieldsFrom(b.tray_groups, b.trays, b.cells_per_tray);
        const [result] = await pool.execute(
            `INSERT INTO seedling_batches (system_id, crop_code, crop_name, seed_variety, sow_date, trays, cells_per_tray, tray_groups, predicted_germ_days, predicted_transplant_days, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.params.systemId, b.crop_code || null, b.crop_name || null, b.seed_variety || null, b.sow_date,
             tf.trays, tf.cells, tf.json,
             intOrNull(b.predicted_germ_days), intOrNull(b.predicted_transplant_days), b.notes || null]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Failed to create seedling batch:', error);
        res.status(500).json({ error: 'Failed to create seedling batch' });
    }
});

// General edit + record germination. Setting a germination date advances the
// status to 'germinated' (unless it's already been transplanted).
router.put('/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const sb = await ownedSeedling(pool, req.params.id, req.user.userId);
        if (!sb) return res.status(404).json({ error: 'Not found or access denied' });
        const b = req.body || {};
        const val = (key, fallback) => (b[key] !== undefined ? b[key] : fallback);
        const germinationDate = val('germination_date', sb.germination_date);
        let status = sb.status;
        if (status !== 'transplanted') status = germinationDate ? 'germinated' : 'sown';
        const tf = b.tray_groups !== undefined
            ? trayFieldsFrom(b.tray_groups, val('trays', sb.trays), val('cells_per_tray', sb.cells_per_tray))
            : { json: sb.tray_groups, trays: Math.max(1, intOrNull(val('trays', sb.trays)) || 1), cells: intOrNull(val('cells_per_tray', sb.cells_per_tray)) };
        await pool.execute(
            `UPDATE seedling_batches SET crop_code=?, crop_name=?, seed_variety=?, sow_date=?, trays=?, cells_per_tray=?, tray_groups=?,
                predicted_germ_days=?, predicted_transplant_days=?, germination_date=?, germinated_count=?, notes=?, status=?
             WHERE id=?`,
            [val('crop_code', sb.crop_code), val('crop_name', sb.crop_name), val('seed_variety', sb.seed_variety),
             val('sow_date', sb.sow_date), tf.trays, tf.cells, tf.json,
             intOrNull(val('predicted_germ_days', sb.predicted_germ_days)), intOrNull(val('predicted_transplant_days', sb.predicted_transplant_days)),
             germinationDate || null, intOrNull(val('germinated_count', sb.germinated_count)), val('notes', sb.notes), status, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update seedling batch:', error);
        res.status(500).json({ error: 'Failed to update seedling batch' });
    }
});

// Transplant a ready batch into a grow bed — creates the bed planting
// (plant_growth) and links it back to this seedling batch.
router.post('/:id/transplant', async (req, res) => {
    try {
        const pool = getDatabase();
        const sb = await ownedSeedling(pool, req.params.id, req.user.userId);
        if (!sb) return res.status(404).json({ error: 'Not found or access denied' });
        const b = req.body || {};
        const bedId = intOrNull(b.grow_bed_id);
        const date = b.transplant_date;
        const count = intOrNull(b.transplanted_count);
        if (!bedId || !date || !count) return res.status(400).json({ error: 'grow_bed_id, transplant_date and transplanted_count are required' });
        const [bed] = await pool.execute('SELECT id FROM grow_beds WHERE id = ? AND system_id = ?', [bedId, sb.system_id]);
        if (bed.length === 0) return res.status(400).json({ error: 'Bed not in this system' });

        // days_to_harvest from the user's crop record, if available.
        let dth = intOrNull(b.days_to_harvest);
        if (dth == null && sb.crop_code) {
            const [crop] = await pool.execute(
                'SELECT growth_days FROM custom_crops WHERE crop_code = ? AND user_id = (SELECT user_id FROM systems WHERE id = ?) LIMIT 1',
                [sb.crop_code, sb.system_id]
            );
            if (crop.length && crop[0].growth_days != null) dth = Number(crop[0].growth_days);
        }
        const cropType = sb.crop_code || (sb.crop_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const batchId = `sb${sb.id}-${cropType}`.slice(0, 100);

        await pool.execute(
            `INSERT INTO plant_growth (system_id, grow_bed_id, date, crop_type, count, plants_per_m2, new_seedlings, growth_stage, batch_id, seed_variety, batch_created_date, days_to_harvest)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'transplant', ?, ?, ?, ?)`,
            [sb.system_id, bedId, date, cropType, count, intOrNull(b.plants_per_m2), count, batchId, sb.seed_variety || null, date, dth]
        );
        await pool.execute(
            `UPDATE seedling_batches SET transplant_date=?, transplanted_count=?, grow_bed_id=?, plant_batch_id=?, status='transplanted' WHERE id=?`,
            [date, count, bedId, batchId, req.params.id]
        );
        res.json({ success: true, batch_id: batchId });
    } catch (error) {
        console.error('Failed to transplant seedling batch:', error);
        res.status(500).json({ error: 'Failed to transplant' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const sb = await ownedSeedling(pool, req.params.id, req.user.userId);
        if (!sb) return res.status(404).json({ error: 'Not found or access denied' });
        await pool.execute('DELETE FROM seedling_batches WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete seedling batch:', error);
        res.status(500).json({ error: 'Failed to delete seedling batch' });
    }
});

module.exports = router;
