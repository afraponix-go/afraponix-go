const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { generateFarmId } = require('../utils/farms');
const { getFarmAccess } = require('../utils/systemAccess');
const { deleteSystemData } = require('../utils/systemCleanup');

router.use(authenticateToken);

// Water/nutrient reading keys the farm overview can show as per-system columns.
const ALLOWED_METRICS = ['ph', 'kh', 'ec', 'dissolved_oxygen', 'temperature', 'humidity', 'salinity', 'ammonia', 'nitrite', 'nitrate', 'iron', 'potassium', 'calcium', 'phosphorus', 'magnesium'];
const DEFAULT_METRICS = ['ph'];
// A system's tracked metrics (systems.tracked_metrics JSON). null = tracks all.
function parseTracked(raw) {
    if (raw == null) return null;
    try { const arr = JSON.parse(raw); if (Array.isArray(arr)) return new Set(arr.filter((k) => typeof k === 'string')); } catch { /* fall through */ }
    return null;
}
// Parse a stored display_metrics JSON array into a clean, allowed key list.
function parseMetrics(raw) {
    if (raw == null) return [...DEFAULT_METRICS];
    try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
            const clean = arr.filter((k) => ALLOWED_METRICS.includes(k));
            return clean.length ? clean : [...DEFAULT_METRICS];
        }
    } catch { /* fall through */ }
    return [...DEFAULT_METRICS];
}

// List the user's farms with a system count.
router.get('/', async (req, res) => {
    try {
        const pool = getDatabase();
        // The user's own farms, plus farms shared with them (accepted). `kind`
        // distinguishes them; `permission` is the share level for shared farms.
        const [rows] = await pool.execute(
            `SELECT f.id, f.name, f.location, f.created_at,
                    (SELECT COUNT(*) FROM systems s WHERE s.farm_id = f.id) AS system_count,
                    'own' AS kind, NULL AS permission
             FROM farms f WHERE f.owner_id = ? AND f.archived_at IS NULL
             UNION
             SELECT f.id, f.name, f.location, f.created_at,
                    (SELECT COUNT(*) FROM systems s WHERE s.farm_id = f.id) AS system_count,
                    'shared' AS kind, fs.permission_level AS permission
             FROM farms f
             JOIN farm_shares fs ON fs.farm_id = f.id
             WHERE fs.shared_with_id = ? AND fs.status = 'accepted' AND f.owner_id <> ? AND f.archived_at IS NULL
             ORDER BY kind ASC, created_at ASC, id ASC`,
            [req.user.userId, req.user.userId, req.user.userId]
        );
        res.json({ farms: rows });
    } catch (error) {
        console.error('Failed to list farms:', error);
        res.status(500).json({ error: 'Failed to load farms' });
    }
});

// Archived (soft-deleted) farms the user owns — for restore or permanent delete.
router.get('/archived', async (req, res) => {
    try {
        const pool = getDatabase();
        const [rows] = await pool.execute(
            `SELECT f.id, f.name, f.location, f.created_at,
                    DATE_FORMAT(f.archived_at, '%Y-%m-%d') AS archived_date,
                    (SELECT COUNT(*) FROM systems s WHERE s.farm_id = f.id) AS system_count
             FROM farms f WHERE f.owner_id = ? AND f.archived_at IS NOT NULL
             ORDER BY f.archived_at DESC`,
            [req.user.userId]
        );
        res.json({ farms: rows });
    } catch (error) {
        console.error('Failed to list archived farms:', error);
        res.status(500).json({ error: 'Failed to load archived farms' });
    }
});

// Restore an archived farm (and its systems become visible again).
router.post('/:id/restore', async (req, res) => {
    try {
        const pool = getDatabase();
        const [own] = await pool.execute('SELECT id FROM farms WHERE id = ? AND owner_id = ?', [req.params.id, req.user.userId]);
        if (!own.length) return res.status(404).json({ error: 'Farm not found or access denied' });
        await pool.execute('UPDATE farms SET archived_at = NULL WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to restore farm:', error);
        res.status(500).json({ error: 'Failed to restore farm' });
    }
});

// Farm rollup: totals across all the farm's systems + a per-system row. Owner
// only (a farm belongs to one user). Reuses the same primitives the per-system
// dashboard computes — fish count/biomass, plants growing/ready, latest pH+temp.
router.get('/:id/summary', async (req, res) => {
    try {
        const pool = getDatabase();
        // Owner or a user the farm is shared with may read the rollup.
        if (!(await getFarmAccess(req.params.id, req.user.userId, pool))) {
            return res.status(404).json({ error: 'Farm not found or access denied' });
        }
        const [own] = await pool.execute('SELECT id, name, display_metrics FROM farms WHERE id = ?', [req.params.id]);
        if (!own.length) return res.status(404).json({ error: 'Farm not found or access denied' });
        const displayMetrics = parseMetrics(own[0].display_metrics);

        const [sysRows] = await pool.execute('SELECT id, system_name, tracked_metrics FROM systems WHERE farm_id = ? ORDER BY created_at ASC', [req.params.id]);
        const systems = sysRows.map((s) => {
            // Seed only the display metrics this system actually tracks (value null
            // until a reading fills it). Untracked metrics are omitted entirely, so
            // they never show a value or flag attention.
            const tracked = parseTracked(s.tracked_metrics);
            const metrics = {};
            for (const k of displayMetrics) if (tracked === null || tracked.has(k)) metrics[k] = null;
            return { id: s.id, system_name: s.system_name, fish_count: 0, biomass_kg: 0, plants_growing: 0, plants_ready: 0, metrics };
        });
        const byId = Object.fromEntries(systems.map((s) => [s.id, s]));
        const ids = sysRows.map((s) => s.id);

        if (ids.length) {
            const ph = ids.map(() => '?').join(',');

            // Fish: count + biomass (count × latest weight, default 50 g).
            const [fish] = await pool.execute(`
                SELECT ft.system_id,
                       SUM(ft.current_fish_count) AS fish_count,
                       SUM(ft.current_fish_count * COALESCE((
                           SELECT fe.weight FROM fish_events fe
                           WHERE fe.system_id = ft.system_id AND fe.fish_tank_id = ft.id AND fe.weight IS NOT NULL
                           ORDER BY (fe.event_type = 'weight_update') DESC, fe.event_date DESC LIMIT 1), 50) / 1000.0) AS biomass_kg
                FROM fish_tanks ft WHERE ft.system_id IN (${ph}) GROUP BY ft.system_id`, ids);
            for (const r of fish) if (byId[r.system_id]) { byId[r.system_id].fish_count = Number(r.fish_count) || 0; byId[r.system_id].biomass_kg = Math.round((Number(r.biomass_kg) || 0) * 10) / 10; }

            // Plants: remaining (growing) and remaining that has reached days-to-harvest (ready).
            const [plants] = await pool.execute(`
                SELECT system_id, SUM(remaining) AS growing, SUM(CASE WHEN ready = 1 THEN remaining ELSE 0 END) AS ready FROM (
                    SELECT pg.system_id, pg.batch_id,
                        GREATEST(0, COALESCE(SUM(CASE WHEN COALESCE(pg.plants_harvested,0) > 0 THEN 0 ELSE COALESCE(NULLIF(pg.new_seedlings,0), pg.count, 0) END),0) - COALESCE(SUM(pg.plants_harvested),0)) AS remaining,
                        (MAX(pg.days_to_harvest) IS NOT NULL AND DATEDIFF(CURDATE(), COALESCE(MIN(pg.batch_created_date), MIN(pg.date))) >= MAX(pg.days_to_harvest)) AS ready
                    FROM plant_growth pg WHERE pg.system_id IN (${ph}) AND pg.batch_id IS NOT NULL AND pg.batch_id <> ''
                    GROUP BY pg.system_id, pg.batch_id
                ) b GROUP BY system_id`, ids);
            for (const r of plants) if (byId[r.system_id]) { byId[r.system_id].plants_growing = Number(r.growing) || 0; byId[r.system_id].plants_ready = Number(r.ready) || 0; }

            // Latest value per selected metric per system.
            if (displayMetrics.length) {
                const mph = displayMetrics.map(() => '?').join(',');
                const [wq] = await pool.execute(`
                    SELECT nr.system_id, nr.nutrient_type, nr.value FROM nutrient_readings nr
                    JOIN (SELECT system_id, nutrient_type, MAX(reading_date) md FROM nutrient_readings
                          WHERE system_id IN (${ph}) AND nutrient_type IN (${mph}) GROUP BY system_id, nutrient_type) x
                      ON x.system_id = nr.system_id AND x.nutrient_type = nr.nutrient_type AND x.md = nr.reading_date`,
                    [...ids, ...displayMetrics]);
                for (const r of wq) {
                    const s = byId[r.system_id]; if (!s) continue;
                    // Only fill metrics the system tracks (seeded above); ignore
                    // stale readings for a metric it has since switched off.
                    if (r.nutrient_type in s.metrics) s.metrics[r.nutrient_type] = Number(r.value);
                }
            }
        }

        const totals = systems.reduce((t, s) => ({
            fish_count: t.fish_count + s.fish_count,
            biomass_kg: Math.round((t.biomass_kg + s.biomass_kg) * 10) / 10,
            plants_growing: t.plants_growing + s.plants_growing,
            plants_ready: t.plants_ready + s.plants_ready,
        }), { fish_count: 0, biomass_kg: 0, plants_growing: 0, plants_ready: 0 });

        res.json({ farm: { id: own[0].id, name: own[0].name }, display_metrics: displayMetrics, system_count: systems.length, totals, systems });
    } catch (error) {
        console.error('Failed to build farm summary:', error);
        res.status(500).json({ error: 'Failed to build farm summary' });
    }
});

// Create a farm.
router.post('/', async (req, res) => {
    try {
        const name = String((req.body && req.body.name) || '').trim().slice(0, 255);
        if (!name) return res.status(400).json({ error: 'name is required' });
        const location = req.body && req.body.location ? String(req.body.location).trim().slice(0, 255) : null;
        const pool = getDatabase();
        const id = generateFarmId();
        await pool.execute('INSERT INTO farms (id, owner_id, name, location) VALUES (?, ?, ?, ?)', [id, req.user.userId, name, location]);
        const [rows] = await pool.execute('SELECT id, name, location, created_at FROM farms WHERE id = ?', [id]);
        res.status(201).json({ farm: rows[0] });
    } catch (error) {
        console.error('Failed to create farm:', error);
        res.status(500).json({ error: 'Failed to create farm' });
    }
});

// Rename / relocate (owner only).
router.put('/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const [own] = await pool.execute('SELECT id FROM farms WHERE id = ? AND owner_id = ?', [req.params.id, req.user.userId]);
        if (!own.length) return res.status(404).json({ error: 'Farm not found or access denied' });
        const b = req.body || {};
        const sets = [], vals = [];
        if (b.name !== undefined) {
            const name = String(b.name).trim().slice(0, 255);
            if (!name) return res.status(400).json({ error: 'name cannot be empty' });
            sets.push('name = ?'); vals.push(name);
        }
        if (b.location !== undefined) {
            sets.push('location = ?'); vals.push(b.location ? String(b.location).trim().slice(0, 255) : null);
        }
        if (b.display_metrics !== undefined) {
            const keys = Array.isArray(b.display_metrics) ? b.display_metrics.filter((k) => ALLOWED_METRICS.includes(k)) : [];
            sets.push('display_metrics = ?'); vals.push(JSON.stringify(keys));
        }
        if (sets.length) { vals.push(req.params.id); await pool.execute(`UPDATE farms SET ${sets.join(', ')} WHERE id = ?`, vals); }
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update farm:', error);
        res.status(500).json({ error: 'Failed to update farm' });
    }
});

// Delete (owner only) — refuses while systems still belong to it.
// "Delete" a farm — soft-delete (archive) so it (and its systems) disappear from
// the app but can be restored. Use /purge for permanent deletion.
router.delete('/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const [own] = await pool.execute('SELECT id FROM farms WHERE id = ? AND owner_id = ?', [req.params.id, req.user.userId]);
        if (!own.length) return res.status(404).json({ error: 'Farm not found or access denied' });
        await pool.execute('UPDATE farms SET archived_at = NOW() WHERE id = ?', [req.params.id]);
        res.json({ success: true, archived: true });
    } catch (error) {
        console.error('Failed to archive farm:', error);
        res.status(500).json({ error: 'Failed to archive farm' });
    }
});

// Permanently delete a farm AND all of its data — every system in the farm (each
// cascading its own data) plus farm-scoped rows (seedling batches, shares). Runs
// in a transaction so it can't leave a half-deleted farm.
router.delete('/:id/purge', async (req, res) => {
    const farmId = req.params.id;
    let connection;
    try {
        const pool = getDatabase();
        const [own] = await pool.execute('SELECT id FROM farms WHERE id = ? AND owner_id = ?', [farmId, req.user.userId]);
        if (!own.length) return res.status(404).json({ error: 'Farm not found or access denied' });

        const [systems] = await pool.execute('SELECT id FROM systems WHERE farm_id = ?', [farmId]);

        connection = await pool.getConnection();
        await connection.beginTransaction();
        for (const s of systems) {
            await deleteSystemData(connection, s.id);
        }
        await connection.execute('DELETE FROM seedling_batches WHERE farm_id = ?', [farmId]);
        await connection.execute('DELETE FROM farm_shares WHERE farm_id = ?', [farmId]);
        await connection.execute('DELETE FROM farms WHERE id = ?', [farmId]);
        await connection.commit();

        res.json({ success: true, deletedSystems: systems.length });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (e) { console.error('Rollback failed:', e); } }
        console.error('Failed to delete farm:', error);
        res.status(500).json({ error: 'Failed to delete farm' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
