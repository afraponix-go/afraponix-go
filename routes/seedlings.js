const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { canWriteSystem, getFarmAccess, WRITE_LEVELS } = require('../utils/systemAccess');
const { batchLabel, buildBatchNumber } = require('../utils/batchNumber');

router.use(authenticateToken);

const canWriteFarm = (acc) => !!acc && (acc.level === 'owner' || WRITE_LEVELS.has(acc.level));

// Fetch a seedling batch the caller may access. Seedlings belong to a farm; a
// couple of legacy rows may only have system_id, so fall back to that. Pass
// write=true to require modify permission; returns the row or null.
async function accessibleSeedling(pool, id, userId, write = true) {
    const [rows] = await pool.execute('SELECT * FROM seedling_batches WHERE id = ?', [id]);
    if (!rows.length) return null;
    const sb = rows[0];
    let ok = false;
    if (sb.farm_id) {
        const acc = await getFarmAccess(sb.farm_id, userId, pool);
        ok = write ? canWriteFarm(acc) : !!acc;
    } else if (sb.system_id) {
        const { canReadSystem } = require('../utils/systemAccess');
        ok = write ? await canWriteSystem(sb.system_id, userId, pool) : await canReadSystem(sb.system_id, userId, pool);
    }
    return ok ? sb : null;
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
  grow_bed_id, plant_batch_id, batch_number, status, notes,
  DATEDIFF(germination_date, sow_date) AS actual_germ_days,
  DATE_FORMAT(DATE_ADD(sow_date, INTERVAL predicted_transplant_days DAY), '%Y-%m-%d') AS predicted_transplant_date,
  DATEDIFF(DATE_ADD(sow_date, INTERVAL predicted_transplant_days DAY), CURDATE()) AS days_to_transplant_remaining,
  DATEDIFF(transplant_date, sow_date) AS actual_transplant_days`;

// The farm's seedling bay (one nursery per farm).
router.get('/:farmId', async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await getFarmAccess(req.params.farmId, req.user.userId, pool))) return res.status(404).json({ error: 'Farm not found or access denied' });
        const [rows] = await pool.execute(
            `SELECT ${SELECT_COLS} FROM seedling_batches WHERE farm_id = ? ORDER BY (status = 'transplanted'), sow_date DESC, id DESC`,
            [req.params.farmId]
        );
        const seedlings = rows.map((r) => { const t = trayInfo(r); return { ...r, tray_groups: t.groups, total_sown: t.total }; });
        res.json({ seedlings });
    } catch (error) {
        console.error('Failed to load seedlings:', error);
        res.status(500).json({ error: 'Failed to load seedlings' });
    }
});

// Sow a new batch into the farm's nursery (not tied to a system yet).
router.post('/:farmId', async (req, res) => {
    try {
        const pool = getDatabase();
        if (!canWriteFarm(await getFarmAccess(req.params.farmId, req.user.userId, pool))) return res.status(404).json({ error: 'Farm not found or access denied' });
        const b = req.body || {};
        if (!b.sow_date) return res.status(400).json({ error: 'sow_date is required' });
        const tf = trayFieldsFrom(b.tray_groups, b.trays, b.cells_per_tray);
        // Human batch number "WW/YY · Label" from the sow week, unique in the farm.
        const [taken] = await pool.execute('SELECT batch_number FROM seedling_batches WHERE farm_id = ? AND batch_number IS NOT NULL', [req.params.farmId]);
        const sowWhen = /^\d{4}-\d{2}-\d{2}/.test(b.sow_date) ? new Date(`${b.sow_date.slice(0, 10)}T12:00:00`) : new Date();
        const batchNumber = buildBatchNumber(batchLabel(b.crop_name || b.crop_code, b.seed_variety), taken.map((r) => r.batch_number), sowWhen);
        const [result] = await pool.execute(
            `INSERT INTO seedling_batches (farm_id, crop_code, crop_name, seed_variety, sow_date, trays, cells_per_tray, tray_groups, predicted_germ_days, predicted_transplant_days, notes, batch_number)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.params.farmId, b.crop_code || null, b.crop_name || null, b.seed_variety || null, b.sow_date,
             tf.trays, tf.cells, tf.json,
             intOrNull(b.predicted_germ_days), intOrNull(b.predicted_transplant_days), b.notes || null, batchNumber]
        );
        res.json({ success: true, id: result.insertId, batch_number: batchNumber });
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
        const sb = await accessibleSeedling(pool, req.params.id, req.user.userId, true);
        if (!sb) return res.status(404).json({ error: 'Not found or access denied' });
        const b = req.body || {};
        const val = (key, fallback) => (b[key] !== undefined ? b[key] : fallback);
        const germinationDate = val('germination_date', sb.germination_date);
        let status = sb.status;
        // Don't disturb a batch that's (partly) transplanted — only sown/germinated flip.
        if (status !== 'transplanted' && status !== 'partially_transplanted') status = germinationDate ? 'germinated' : 'sown';
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
        const sb = await accessibleSeedling(pool, req.params.id, req.user.userId, true);
        if (!sb) return res.status(404).json({ error: 'Not found or access denied' });
        const b = req.body || {};
        const bedId = intOrNull(b.grow_bed_id);
        const targetSystemId = b.system_id;
        const date = b.transplant_date;
        const count = intOrNull(b.transplanted_count);
        if (!targetSystemId || !bedId || !date || !count) return res.status(400).json({ error: 'system_id, grow_bed_id, transplant_date and transplanted_count are required' });

        // The destination system must belong to this seedling's farm, the caller
        // must be able to write it, and the bed must be in that system.
        const [sys] = await pool.execute('SELECT id, user_id FROM systems WHERE id = ? AND farm_id = ?', [targetSystemId, sb.farm_id]);
        if (sys.length === 0) return res.status(400).json({ error: 'System is not in this farm' });
        if (!(await canWriteSystem(targetSystemId, req.user.userId, pool))) return res.status(403).json({ error: 'No write access to that system' });
        const [bed] = await pool.execute('SELECT id FROM grow_beds WHERE id = ? AND system_id = ?', [bedId, targetSystemId]);
        if (bed.length === 0) return res.status(400).json({ error: 'Bed not in that system' });

        // days_to_harvest from the destination owner's crop record, if available.
        let dth = intOrNull(b.days_to_harvest);
        if (dth == null && sb.crop_code) {
            const [crop] = await pool.execute(
                'SELECT growth_days FROM custom_crops WHERE crop_code = ? AND user_id = ? LIMIT 1',
                [sb.crop_code, sys[0].user_id]
            );
            if (crop.length && crop[0].growth_days != null) dth = Number(crop[0].growth_days);
        }
        const cropType = sb.crop_code || (sb.crop_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');

        // Don't transplant more than the batch has left (germinated, else sown).
        const sourceTotal = intOrNull(sb.germinated_count) ?? trayInfo(sb).total;
        const already = intOrNull(sb.transplanted_count) || 0;
        const remaining = sourceTotal - already;
        if (remaining <= 0) return res.status(400).json({ error: 'This batch has already been fully transplanted' });
        if (count > remaining) return res.status(400).json({ error: `Only ${remaining} seedling${remaining === 1 ? '' : 's'} remain to transplant` });

        // Every planting inherits the seedling batch number with a "-N" split
        // suffix, so it's always traceable back. Backfill the number for legacy
        // rows sown before batch numbers existed.
        let base = sb.batch_number;
        if (!base) {
            const [taken] = await pool.execute('SELECT batch_number FROM seedling_batches WHERE farm_id = ? AND batch_number IS NOT NULL', [sb.farm_id]);
            const sowWhen = sb.sow_date ? new Date(new Date(sb.sow_date).getTime()) : new Date();
            base = buildBatchNumber(batchLabel(sb.crop_name || sb.crop_code, sb.seed_variety), taken.map((r) => r.batch_number), sowWhen);
            await pool.execute('UPDATE seedling_batches SET batch_number = ? WHERE id = ?', [base, sb.id]);
        }
        // Next split index: max existing "-N" for this base across the farm + 1.
        const [farmSystems] = await pool.execute('SELECT id FROM systems WHERE farm_id = ?', [sb.farm_id]);
        let nextSplit = 1;
        if (farmSystems.length) {
            const placeholders = farmSystems.map(() => '?').join(',');
            const [prior] = await pool.execute(
                `SELECT DISTINCT batch_id FROM plant_growth WHERE system_id IN (${placeholders}) AND batch_id LIKE ?`,
                [...farmSystems.map((s) => s.id), `${base}-%`]
            );
            for (const row of prior) {
                const n = parseInt(String(row.batch_id).slice(base.length + 1), 10);
                if (Number.isFinite(n) && n >= nextSplit) nextSplit = n + 1;
            }
        }
        const batchId = `${base}-${nextSplit}`;
        // Accumulate what's been transplanted; only mark done once it's all placed.
        const newTransplanted = already + count;
        const status = newTransplanted >= sourceTotal ? 'transplanted' : 'partially_transplanted';

        // Atomic: the bed planting and the seedling update both land, or neither —
        // otherwise a failure orphans a planting and burns a split number.
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            await conn.execute(
                `INSERT INTO plant_growth (system_id, grow_bed_id, date, crop_type, count, plants_per_m2, new_seedlings, growth_stage, batch_id, seed_variety, batch_created_date, days_to_harvest)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'transplant', ?, ?, ?, ?)`,
                [targetSystemId, bedId, date, cropType, count, intOrNull(b.plants_per_m2), count, batchId, sb.seed_variety || null, date, dth]
            );
            await conn.execute(
                `UPDATE seedling_batches SET transplant_date=?, transplanted_count=?, system_id=?, grow_bed_id=?, plant_batch_id=?, status=? WHERE id=?`,
                [date, newTransplanted, targetSystemId, bedId, batchId, status, req.params.id]
            );
            await conn.commit();
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
        res.json({ success: true, batch_id: batchId, status, transplanted_count: newTransplanted, remaining: sourceTotal - newTransplanted });
    } catch (error) {
        console.error('Failed to transplant seedling batch:', error);
        res.status(500).json({ error: 'Failed to transplant' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const sb = await accessibleSeedling(pool, req.params.id, req.user.userId, true);
        if (!sb) return res.status(404).json({ error: 'Not found or access denied' });
        await pool.execute('DELETE FROM seedling_batches WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete seedling batch:', error);
        res.status(500).json({ error: 'Failed to delete seedling batch' });
    }
});

module.exports = router;
