const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { canReadSystem, canWriteSystem, canCaptureSystem, isOwnEntryToday } = require('../utils/systemAccess');

// Operating programmes — the third type in the unified programme core
// (see database/migrations/2026-08-programme-core.sql), alongside spray and
// dosing. A task is free-text (programme_items.label) rather than drawn from
// a shared catalogue like spray_products/dosing_products — the Operator
// Access proposal's Phase 3 scoped this down deliberately ("first cut...
// minutes-spent and labour totals stay a later refinement"), and a task like
// "Feed fish" or "Weigh Tank 3" doesn't need one. Cadence is weekday-only,
// the one schedule_kind spray already proved end to end.
router.use(authenticateToken);

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const numN = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
const todayStr = () => new Date().toISOString().slice(0, 10);
const isValidDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

// Fetch an operating programme the caller may modify (owner or write-level share).
async function ownedProgramme(pool, id, userId) {
    const [rows] = await pool.execute("SELECT * FROM programmes WHERE id = ? AND type = 'operating'", [id]);
    if (!rows.length) return null;
    return (await canWriteSystem(rows[0].system_id, userId, pool)) ? rows[0] : null;
}

async function programmeTasks(pool, programmeId) {
    const [rows] = await pool.execute(
        'SELECT id, label, weekdays, est_minutes FROM programme_items WHERE programme_id = ? ORDER BY sort_order, id',
        [programmeId]
    );
    return rows.map((r) => ({ ...r, weekdays: r.weekdays ? r.weekdays.split(',').filter(Boolean) : [] }));
}

// Replace every task on a programme (create-or-edit both send the full list —
// simpler than diffing, and matches replacePlanProducts' spray pattern).
async function replaceTasks(pool, programmeId, tasks) {
    await pool.execute('DELETE FROM programme_items WHERE programme_id = ?', [programmeId]);
    let sort = 0;
    for (const t of tasks || []) {
        const label = String((t && t.label) || '').trim().slice(0, 255);
        if (!label) continue;
        const days = Array.isArray(t.weekdays) ? t.weekdays.filter((d) => WEEKDAYS.includes(d)).join(',') : '';
        await pool.execute(
            "INSERT INTO programme_items (programme_id, label, schedule_kind, weekdays, est_minutes, sort_order) VALUES (?, ?, 'weekdays', ?, ?, ?)",
            [programmeId, label, days, numN(t.est_minutes), sort++]
        );
    }
}

// ------------------------------------------------------------- programmes

router.get('/programmes/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await canReadSystem(req.params.systemId, req.user.userId, pool))) return res.status(404).json({ error: 'System not found or access denied' });
        const [plans] = await pool.execute(
            "SELECT id, system_id, name, notes, status, created_at FROM programmes WHERE system_id = ? AND type = 'operating' ORDER BY status, created_at DESC",
            [req.params.systemId]
        );
        const out = [];
        for (const plan of plans) out.push({ ...plan, tasks: await programmeTasks(pool, plan.id) });
        res.json({ programmes: out });
    } catch (error) {
        console.error('Failed to load operating programmes:', error);
        res.status(500).json({ error: 'Failed to load programmes' });
    }
});

router.post('/programmes/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await canWriteSystem(req.params.systemId, req.user.userId, pool))) return res.status(404).json({ error: 'System not found or access denied' });
        const b = req.body || {};
        if (!b.name) return res.status(400).json({ error: 'name is required' });
        const [result] = await pool.execute(
            "INSERT INTO programmes (system_id, type, name, notes, status) VALUES (?, 'operating', ?, ?, ?)",
            [req.params.systemId, String(b.name).slice(0, 255), b.notes || null, b.status === 'paused' ? 'paused' : 'active']
        );
        await replaceTasks(pool, result.insertId, b.tasks);
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Failed to create operating programme:', error);
        res.status(500).json({ error: 'Failed to create programme' });
    }
});

router.put('/programmes/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const plan = await ownedProgramme(pool, req.params.id, req.user.userId);
        if (!plan) return res.status(404).json({ error: 'Programme not found or access denied' });
        const b = req.body || {};
        await pool.execute(
            'UPDATE programmes SET name=?, notes=?, status=? WHERE id=?',
            [String(b.name ?? plan.name).slice(0, 255), b.notes ?? plan.notes, b.status === 'paused' ? 'paused' : 'active', req.params.id]
        );
        if (Array.isArray(b.tasks)) await replaceTasks(pool, Number(req.params.id), b.tasks);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update operating programme:', error);
        res.status(500).json({ error: 'Failed to update programme' });
    }
});

router.delete('/programmes/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        const plan = await ownedProgramme(pool, req.params.id, req.user.userId);
        if (!plan) return res.status(404).json({ error: 'Programme not found or access denied' });
        // programme_items cascade; programme_log keeps its history (no FK on programme_id).
        await pool.execute('DELETE FROM programmes WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete operating programme:', error);
        res.status(500).json({ error: 'Failed to delete programme' });
    }
});

// ------------------------------------------------------------- today's tasks

// The tasks due on a given date (default today) for a system, each folded
// with its log status for that date — 'open' (nothing logged yet), 'done',
// or 'skipped'. This is the operator Today list's data source.
router.get('/due/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await canReadSystem(req.params.systemId, req.user.userId, pool))) return res.status(404).json({ error: 'System not found or access denied' });
        const date = isValidDate(req.query.date) ? req.query.date : todayStr();
        const dow = WEEKDAYS[new Date(`${date}T00:00:00`).getDay()];

        const [plans] = await pool.execute("SELECT id, name FROM programmes WHERE system_id = ? AND type = 'operating' AND status = 'active'", [req.params.systemId]);
        const due = [];
        for (const plan of plans) {
            const tasks = await programmeTasks(pool, plan.id);
            for (const t of tasks) {
                if (!t.weekdays.includes(dow)) continue;
                due.push({ programme_id: plan.id, programme_name: plan.name, item_id: t.id, label: t.label, est_minutes: t.est_minutes, status: 'open', log_id: null, operator_name: null });
            }
        }
        const [logs] = await pool.execute(
            "SELECT id, item_id, status, operator_name FROM programme_log WHERE system_id = ? AND type = 'operating' AND event_date = ?",
            [req.params.systemId, date]
        );
        const byItem = new Map(logs.map((l) => [l.item_id, l]));
        for (const d of due) {
            const l = byItem.get(d.item_id);
            if (l) { d.status = l.status; d.log_id = l.id; d.operator_name = l.operator_name; }
        }
        res.json({ date, due });
    } catch (error) {
        console.error('Failed to load due tasks:', error);
        res.status(500).json({ error: 'Failed to load due tasks' });
    }
});

// Mark a task done or skipped for a date (default today) — a capture action,
// open to a restricted operator share (this is the whole point of Phase 3).
router.post('/log', async (req, res) => {
    try {
        const b = req.body || {};
        const pool = getDatabase();
        if (!b.system_id || !b.item_id || !['done', 'skipped'].includes(b.status)) {
            return res.status(400).json({ error: 'system_id, item_id and a valid status are required' });
        }
        if (!(await canCaptureSystem(b.system_id, req.user.userId, pool))) return res.status(404).json({ error: 'System not found or access denied' });
        const [items] = await pool.execute('SELECT programme_id, label FROM programme_items WHERE id = ?', [b.item_id]);
        if (!items.length) return res.status(404).json({ error: 'Task not found' });
        const date = isValidDate(b.date) ? b.date : todayStr();

        const [u] = await pool.execute('SELECT first_name, username FROM users WHERE id = ?', [req.user.userId]);
        const operatorName = u[0]?.first_name || u[0]?.username || null;

        // Re-marking the same task/date replaces the previous entry (e.g. flipping
        // done -> skipped), rather than piling up duplicate log rows. The task's
        // label is snapshotted into product_name (generic, unused by operating
        // otherwise) so log history reads correctly even after the programme is
        // later edited — replaceTasks wipes and reinserts programme_items, so a
        // live join would go stale/orphaned for anything logged before an edit.
        await pool.execute("DELETE FROM programme_log WHERE system_id = ? AND type = 'operating' AND item_id = ? AND event_date = ?", [b.system_id, b.item_id, date]);
        const [result] = await pool.execute(
            `INSERT INTO programme_log (system_id, programme_id, item_id, type, event_date, status, operator_id, operator_name, product_name, notes)
             VALUES (?, ?, ?, 'operating', ?, ?, ?, ?, ?, ?)`,
            [b.system_id, items[0].programme_id, b.item_id, date, b.status, req.user.userId, operatorName, items[0].label, b.notes || null]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Failed to log task:', error);
        res.status(500).json({ error: 'Failed to log task' });
    }
});

// Undo a completion (back to 'open') — a full-write account may undo any
// entry; an operator only their own, same-day one (the standard Operator
// Access boundary — see isOwnEntryToday).
router.delete('/log/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        // event_date needs an explicit DATE_FORMAT — mysql2 otherwise returns it as
        // a JS Date object, which isOwnEntryToday's string comparison can't read.
        const [rows] = await pool.execute("SELECT *, DATE_FORMAT(event_date, '%Y-%m-%d') AS event_date_str FROM programme_log WHERE id = ? AND type = 'operating'", [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Not found or access denied' });
        const log = rows[0];
        const canFullWrite = await canWriteSystem(log.system_id, req.user.userId, pool);
        if (!canFullWrite) {
            const canCapture = await canCaptureSystem(log.system_id, req.user.userId, pool);
            if (!canCapture || !isOwnEntryToday(log.operator_id, req.user.userId, log.event_date_str)) {
                return res.status(404).json({ error: 'Not found or access denied' });
            }
        }
        await pool.execute('DELETE FROM programme_log WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to undo log entry:', error);
        res.status(500).json({ error: 'Failed to undo log entry' });
    }
});

// Recent log history for a system (the Operations Log tab's operating section).
router.get('/log/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();
        if (!(await canReadSystem(req.params.systemId, req.user.userId, pool))) return res.status(404).json({ error: 'System not found or access denied' });
        const [rows] = await pool.execute(
            `SELECT id, item_id, programme_id, DATE_FORMAT(event_date, '%Y-%m-%d') AS event_date, status, operator_name, notes,
                    product_name AS label
             FROM programme_log
             WHERE system_id = ? AND type = 'operating'
             ORDER BY event_date DESC, id DESC LIMIT 200`,
            [req.params.systemId]
        );
        res.json({ log: rows });
    } catch (error) {
        console.error('Failed to load operating log:', error);
        res.status(500).json({ error: 'Failed to load log' });
    }
});

module.exports = router;
