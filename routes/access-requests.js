const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { sendAccessRequestEmail, sendAccessDecisionEmail } = require('../utils/emailService');
const { applySelection, parseSelection } = require('./farm-sharing');
const { accessibleSystemIds } = require('../utils/systemAccess');

router.use(authenticateToken);

const VALID_LEVELS = ['view', 'operator', 'collaborator', 'admin'];
const baseUrl = () => process.env.BASE_URL || 'https://go.afraponix.com';
const displayName = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.username || u?.email || 'Someone';

// Can this user manage the farm's sharing? Owner, or an accepted 'admin' share.
// (Same rule as routes/farm-sharing.js.) Returns the farm row or null.
async function manageableFarm(pool, farmId, userId) {
    const [rows] = await pool.execute('SELECT id, name, owner_id FROM farms WHERE id = ?', [farmId]);
    const farm = rows[0];
    if (!farm) return null;
    if (farm.owner_id === userId) return farm;
    const [sh] = await pool.execute(
        "SELECT id FROM farm_shares WHERE farm_id = ? AND shared_with_id = ? AND status = 'accepted' AND permission_level = 'admin'",
        [farmId, userId]
    );
    return sh[0] ? farm : null;
}

async function hasAccess(pool, userId, farm, system) {
    if (farm.owner_id === userId) return true;
    if (system && system.user_id === userId) return true;
    const [f] = await pool.execute("SELECT id FROM farm_shares WHERE farm_id = ? AND shared_with_id = ? AND status = 'accepted'", [farm.id, userId]);
    if (f[0]) return true;
    if (system) {
        const [s] = await pool.execute("SELECT id FROM system_shares WHERE system_id = ? AND shared_with_id = ? AND status = 'accepted'", [system.id, userId]);
        if (s[0]) return true;
    }
    return false;
}

// Ask for access to the farm (or system) a scanned label belongs to.
// Body: { farm_id? , system_id? , message? }
router.post('/', async (req, res) => {
    const { farm_id, system_id } = req.body || {};
    const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 300) : '';
    const clean = (v) => (typeof v === 'string' && v.length > 0 && v.length <= 255 ? v : null);
    const farmIdIn = clean(farm_id);
    const systemIdIn = clean(system_id);
    if (!farmIdIn && !systemIdIn) return res.status(400).json({ error: 'A farm or system is required' });

    try {
        const pool = getDatabase();
        const userId = req.user.userId;

        // Resolve what the label points at. Ids are unguessable, so telling the
        // scanner "that no longer exists" doesn't open an enumeration hole.
        let system = null;
        let farm = null;
        if (systemIdIn) {
            const [s] = await pool.execute('SELECT id, system_name, user_id, farm_id FROM systems WHERE id = ?', [systemIdIn]);
            system = s[0] || null;
            if (system?.farm_id) {
                const [f] = await pool.execute('SELECT id, name, owner_id FROM farms WHERE id = ?', [system.farm_id]);
                farm = f[0] || null;
            }
        } else {
            const [f] = await pool.execute('SELECT id, name, owner_id FROM farms WHERE id = ?', [farmIdIn]);
            farm = f[0] || null;
        }
        if (!farm) return res.status(404).json({ error: 'not_found', message: 'That label’s farm no longer exists.' });

        if (await hasAccess(pool, userId, farm, system)) return res.json({ ok: true, already_has_access: true });

        // Throttle: a handful per hour, and one open request per farm per day.
        const [recent] = await pool.execute('SELECT COUNT(*) AS n FROM access_requests WHERE requester_id = ? AND created_at > (NOW() - INTERVAL 1 HOUR)', [userId]);
        if (recent[0].n >= 5) return res.status(429).json({ error: 'Too many requests — please try again later.' });
        const [open] = await pool.execute(
            "SELECT id FROM access_requests WHERE requester_id = ? AND farm_id = ? AND status = 'pending' AND created_at > (NOW() - INTERVAL 1 DAY)",
            [userId, farm.id]
        );
        if (open[0]) return res.json({ ok: true, already_requested: true });

        const token = crypto.randomBytes(32).toString('hex');
        await pool.execute(
            'INSERT INTO access_requests (token, requester_id, farm_id, system_id, message) VALUES (?, ?, ?, ?, ?)',
            [token, userId, farm.id, system ? system.id : null, message || null]
        );

        // Recipients: the farm owner plus accepted farm admins.
        const [recips] = await pool.execute(
            `SELECT DISTINCT u.email FROM users u
             WHERE u.email IS NOT NULL AND u.email <> '' AND (
               u.id = ?
               OR u.id IN (SELECT shared_with_id FROM farm_shares WHERE farm_id = ? AND status = 'accepted' AND permission_level = 'admin' AND shared_with_id IS NOT NULL)
             )`,
            [farm.owner_id, farm.id]
        );
        const [me] = await pool.execute('SELECT first_name, last_name, username, email FROM users WHERE id = ?', [userId]);
        const reviewUrl = `${baseUrl()}/access-request/${token}`;
        if (process.env.NODE_ENV !== 'production') console.log('[access-request] review link (dev):', reviewUrl);

        // Fire and forget — the request is stored either way.
        Promise.allSettled(recips.map((r) => sendAccessRequestEmail(r.email, {
            requesterName: displayName(me[0]), requesterEmail: me[0]?.email,
            farmName: farm.name, systemName: system?.system_name || null, message, reviewUrl,
        }))).then((rs) => rs.forEach((r) => { if (r.status === 'rejected' || r.value?.success === false) console.error('Access request email failed:', r.reason?.message || r.value?.error); }));

        res.json({ ok: true, notified: recips.length });
    } catch (error) {
        console.error('Access request error:', error);
        res.status(500).json({ error: 'Could not send the request' });
    }
});

// Load a request for the review page. 404 (not 403) for anyone who can't manage
// the farm, so the link reveals nothing to the wrong person.
async function loadForManager(pool, token, userId) {
    if (!/^[0-9a-f]{64}$/.test(token)) return null;
    const [rows] = await pool.execute('SELECT * FROM access_requests WHERE token = ?', [token]);
    const r = rows[0];
    if (!r) return null;
    const farm = await manageableFarm(pool, r.farm_id, userId);
    if (!farm) return null;
    return { r, farm };
}

router.get('/:token', async (req, res) => {
    try {
        const pool = getDatabase();
        const found = await loadForManager(pool, req.params.token, req.user.userId);
        if (!found) return res.status(404).json({ error: 'Request not found' });
        const { r, farm } = found;
        const [u] = await pool.execute('SELECT first_name, last_name, username, email FROM users WHERE id = ?', [r.requester_id]);
        let systemName = null;
        if (r.system_id) {
            const [s] = await pool.execute('SELECT system_name FROM systems WHERE id = ?', [r.system_id]);
            systemName = s[0]?.system_name || null;
        }
        res.json({
            status: r.status, message: r.message, created_at: r.created_at, decided_at: r.decided_at,
            granted_level: r.granted_level, granted_scope: r.granted_scope,
            requester: { name: displayName(u[0]), email: u[0]?.email || null },
            farm: { id: farm.id, name: farm.name },
            system: r.system_id ? { id: r.system_id, name: systemName } : null,
            // What the approver can choose from (every system in the farm, unless
            // their own access is limited to a few).
            systems: await (async () => {
                const [all] = await pool.execute('SELECT id, system_name FROM systems WHERE farm_id = ? ORDER BY created_at ASC', [farm.id]);
                const allowed = await accessibleSystemIds(farm.id, req.user.userId, pool);
                return (allowed ? all.filter((x) => allowed.includes(x.id)) : all).map((x) => ({ id: x.id, name: x.system_name }));
            })(),
            can_share_all: !(await accessibleSystemIds(farm.id, req.user.userId, pool)),
        });
    } catch (error) {
        console.error('Access request error:', error);
        res.status(500).json({ error: 'Could not load the request' });
    }
});

// Approve (with a chosen level and scope) or decline.
// Body: { action: 'approve'|'decline', permission_level?, system_ids?: string[] | null }
// The farm is shared; system_ids picks which of its systems they can use (null = all).
router.post('/:token/decision', async (req, res) => {
    const { action, permission_level, system_ids } = req.body || {};
    if (action !== 'approve' && action !== 'decline') return res.status(400).json({ error: 'action must be approve or decline' });
    try {
        const pool = getDatabase();
        const found = await loadForManager(pool, req.params.token, req.user.userId);
        if (!found) return res.status(404).json({ error: 'Request not found' });
        const { r, farm } = found;
        if (r.status !== 'pending') return res.status(409).json({ error: `This request was already ${r.status}.`, status: r.status });

        const [u] = await pool.execute('SELECT id, email FROM users WHERE id = ?', [r.requester_id]);
        const requester = u[0];

        if (action === 'decline') {
            await pool.execute("UPDATE access_requests SET status = 'declined', decided_by = ?, decided_at = NOW() WHERE id = ?", [req.user.userId, r.id]);
            if (requester?.email) sendAccessDecisionEmail(requester.email, { approved: false, farmName: farm.name }).catch(() => {});
            return res.json({ ok: true, status: 'declined' });
        }

        const level = VALID_LEVELS.includes(permission_level) ? permission_level : 'operator';
        if (!requester) return res.status(409).json({ error: 'The person who asked no longer has an account.' });

        // The farm is shared; the selection decides which of its systems they get.
        const selection = await parseSelection(pool, farm.id, req.user.userId, system_ids);
        if (!selection.ok) return res.status(400).json({ error: selection.error });

        const [ex] = await pool.execute('SELECT id FROM farm_shares WHERE farm_id = ? AND shared_with_id = ?', [farm.id, requester.id]);
        let shareId;
        if (ex[0]) {
            shareId = ex[0].id;
            await pool.execute("UPDATE farm_shares SET permission_level = ?, status = 'accepted' WHERE id = ?", [level, shareId]);
        } else {
            const [ins] = await pool.execute("INSERT INTO farm_shares (farm_id, owner_id, shared_with_id, permission_level, status) VALUES (?, ?, ?, ?, 'accepted')", [farm.id, farm.owner_id, requester.id, level]);
            shareId = ins.insertId;
        }
        await applySelection(pool, shareId, selection.ids);
        await pool.execute(
            "UPDATE access_requests SET status = 'approved', decided_by = ?, decided_at = NOW(), granted_level = ?, granted_scope = ? WHERE id = ?",
            [req.user.userId, level, selection.ids === null ? 'all' : 'systems', r.id]
        );
        if (requester.email) sendAccessDecisionEmail(requester.email, { approved: true, farmName: farm.name, level, appUrl: baseUrl() }).catch(() => {});
        res.json({ ok: true, status: 'approved', permission_level: level, system_count: selection.ids === null ? null : selection.ids.length });
    } catch (error) {
        console.error('Access request decision error:', error);
        res.status(500).json({ error: 'Could not record the decision' });
    }
});

module.exports = router;
