const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { accessibleSystemIds } = require('../utils/systemAccess');

router.use(authenticateToken);

const VALID = ['view', 'operator', 'collaborator', 'admin'];

// Confirm the caller can manage this farm's sharing — the owner, or anyone
// holding an accepted 'admin' share on it (admins can see/manage sharing too).
async function canManageFarmSharing(pool, farmId, userId) {
    const [farmRows] = await pool.execute('SELECT id, name, owner_id FROM farms WHERE id = ?', [farmId]);
    const farm = farmRows[0];
    if (!farm) return null;
    if (farm.owner_id === userId) return farm;
    const [shareRows] = await pool.execute(
        "SELECT id FROM farm_shares WHERE farm_id = ? AND shared_with_id = ? AND status = 'accepted' AND permission_level = 'admin'",
        [farmId, userId]
    );
    return shareRows[0] ? farm : null;
}

// Systems this caller may hand out: the owner (or an admin whose own share covers
// every system) can assign any system in the farm; an admin limited to a few
// systems can only pass those on.
async function assignableSystems(pool, farmId, userId) {
    const [all] = await pool.execute('SELECT id, system_name FROM systems WHERE farm_id = ? ORDER BY created_at ASC', [farmId]);
    const allowed = await accessibleSystemIds(farmId, userId, pool);
    return { systems: allowed ? all.filter((x) => allowed.includes(x.id)) : all, restricted: !!allowed };
}

// Validate a requested selection: undefined/null = every system (only allowed
// when the caller can assign every system); otherwise a non-empty subset of the
// systems they can assign. Returns { ok, ids } or { ok:false, error }.
async function parseSelection(pool, farmId, userId, raw) {
    const { systems, restricted } = await assignableSystems(pool, farmId, userId);
    if (raw === undefined || raw === null) {
        return restricted ? { ok: false, error: 'Choose which systems to share — you only have access to some of them.' } : { ok: true, ids: null };
    }
    if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: 'Choose at least one system to share, or share all systems.' };
    const valid = new Set(systems.map((x) => x.id));
    const ids = [...new Set(raw.map(String))];
    if (ids.some((id) => !valid.has(id))) return { ok: false, error: 'One of those systems isn’t part of this farm.' };
    return { ok: true, ids };
}

// Store a share's system selection (ids = null → all systems, including future ones).
async function applySelection(pool, shareId, ids) {
    await pool.execute('DELETE FROM farm_share_systems WHERE share_id = ?', [shareId]);
    if (ids === null) {
        await pool.execute('UPDATE farm_shares SET all_systems = 1 WHERE id = ?', [shareId]);
        return;
    }
    await pool.execute('UPDATE farm_shares SET all_systems = 0 WHERE id = ?', [shareId]);
    for (const id of ids) await pool.execute('INSERT IGNORE INTO farm_share_systems (share_id, system_id) VALUES (?, ?)', [shareId, id]);
}

// Attach { all_systems, system_ids } to share rows for the sharing UI.
async function withSelections(pool, rows) {
    if (!rows.length) return rows;
    const ph = rows.map(() => '?').join(',');
    const [sel] = await pool.execute(`SELECT share_id, system_id FROM farm_share_systems WHERE share_id IN (${ph})`, rows.map((r) => r.id));
    const by = new Map();
    for (const r of sel) { if (!by.has(r.share_id)) by.set(r.share_id, []); by.get(r.share_id).push(r.system_id); }
    return rows.map((r) => ({ ...r, all_systems: !!r.all_systems, system_ids: by.get(r.id) || [] }));
}

// Resolve the farm a share row belongs to, for permission/access routes that
// only carry a share_id.
async function farmIdForShare(pool, shareId) {
    const [rows] = await pool.execute('SELECT farm_id FROM farm_shares WHERE id = ?', [shareId]);
    return rows[0]?.farm_id || null;
}

// List the collaborators a farm is shared with.
router.get('/users', async (req, res) => {
    const { farm_id } = req.query;
    if (!farm_id) return res.status(400).json({ error: 'Farm ID is required' });
    try {
        const pool = getDatabase();
        if (!(await canManageFarmSharing(pool, farm_id, req.user.userId))) {
            return res.status(403).json({ error: 'Not authorized to view this farm' });
        }
        const [shares] = await pool.execute(
            `SELECT fs.id, fs.permission_level, fs.status, fs.created_at, fs.all_systems,
                    u.username, u.email, u.first_name, u.last_name
             FROM farm_shares fs
             JOIN users u ON fs.shared_with_id = u.id
             WHERE fs.farm_id = ? AND fs.status = 'accepted'
             ORDER BY fs.created_at DESC`,
            [farm_id]
        );
        res.json({ shares: await withSelections(pool, shares || []) });
    } catch (error) {
        console.error('Farm sharing error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// The systems the caller can choose from when sharing this farm.
router.get('/systems', async (req, res) => {
    const { farm_id } = req.query;
    if (!farm_id) return res.status(400).json({ error: 'Farm ID is required' });
    try {
        const pool = getDatabase();
        if (!(await canManageFarmSharing(pool, farm_id, req.user.userId))) {
            return res.status(403).json({ error: 'Not authorized to view this farm' });
        }
        const { systems, restricted } = await assignableSystems(pool, farm_id, req.user.userId);
        res.json({ systems: systems.map((x) => ({ id: x.id, name: x.system_name })), can_share_all: !restricted });
    } catch (error) {
        console.error('Farm sharing error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Pending invitations for a farm — includes email-only invites (no account
// yet: shared_with_id IS NULL), same as system-sharing's /invitations.
router.get('/invitations', async (req, res) => {
    const { farm_id } = req.query;
    if (!farm_id) return res.status(400).json({ error: 'Farm ID is required' });
    try {
        const pool = getDatabase();
        if (!(await canManageFarmSharing(pool, farm_id, req.user.userId))) {
            return res.status(403).json({ error: 'Not authorized to view this farm' });
        }
        const [invitations] = await pool.execute(
            `SELECT fs.id, fs.permission_level, fs.created_at, fs.all_systems,
                    u.username, COALESCE(u.email, fs.shared_with_email) AS email, u.first_name, u.last_name,
                    (fs.shared_with_id IS NULL) AS awaiting_signup
             FROM farm_shares fs
             LEFT JOIN users u ON fs.shared_with_id = u.id
             WHERE fs.farm_id = ? AND fs.status = 'pending'
             ORDER BY fs.created_at DESC`,
            [farm_id]
        );
        res.json({ invitations: await withSelections(pool, invitations || []) });
    } catch (error) {
        console.error('Farm sharing error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Share a farm with a user by email. Granted immediately if they already have
// an account (no accept step, matching system sharing). If not, a pending
// invite is stored by email and they're notified — it links to their account
// when they sign up with that email (see routes/auth.js).
router.post('/invite', async (req, res) => {
    const { farm_id, email, permission_level, system_ids } = req.body;
    if (!farm_id || !email || !permission_level) {
        return res.status(400).json({ error: 'Farm ID, email, and permission level are required' });
    }
    if (!VALID.includes(permission_level)) {
        return res.status(400).json({ error: 'Invalid permission level' });
    }
    try {
        const pool = getDatabase();
        const farm = await canManageFarmSharing(pool, farm_id, req.user.userId);
        if (!farm) {
            return res.status(403).json({ error: 'Not authorized to share this farm' });
        }
        const selection = await parseSelection(pool, farm_id, req.user.userId, system_ids);
        if (!selection.ok) return res.status(400).json({ error: selection.error });
        const [userRows] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        const user = userRows[0];

        if (!user) {
            const [existingInvite] = await pool.execute(
                'SELECT id FROM farm_shares WHERE farm_id = ? AND shared_with_email = ? AND shared_with_id IS NULL',
                [farm_id, email]
            );
            if (existingInvite[0]) {
                return res.status(400).json({ error: 'That email has already been invited to this farm' });
            }
            const [inv] = await pool.execute(
                `INSERT INTO farm_shares (farm_id, owner_id, shared_with_email, permission_level, status)
                 VALUES (?, ?, ?, ?, 'pending')`,
                [farm_id, req.user.userId, email, permission_level]
            );
            await applySelection(pool, inv.insertId, selection.ids);
            const [ownerRows] = await pool.execute('SELECT first_name, username FROM users WHERE id = ?', [req.user.userId]);
            const inviterName = ownerRows[0]?.first_name || ownerRows[0]?.username || 'An Afraponix Go user';
            const { sendSystemShareInvite } = require('../utils/emailService');
            sendSystemShareInvite(email, farm.name, inviterName, permission_level, 'farm').catch((e) => console.error('Farm invite email error:', e.message));
            return res.json({ success: true, invited: true, message: `Invitation sent to ${email} — they'll get an email to create an account.` });
        }

        if (user.id === req.user.userId) return res.status(400).json({ error: 'Cannot share a farm with yourself' });

        const [existing] = await pool.execute(
            'SELECT id FROM farm_shares WHERE farm_id = ? AND shared_with_id = ?',
            [farm_id, user.id]
        );
        if (existing.length) return res.status(400).json({ error: 'This farm is already shared with that user' });

        const [result] = await pool.execute(
            `INSERT INTO farm_shares (farm_id, owner_id, shared_with_id, permission_level, status)
             VALUES (?, ?, ?, ?, 'accepted')`,
            [farm_id, req.user.userId, user.id, permission_level]
        );
        await applySelection(pool, result.insertId, selection.ids);
        res.json({ success: true, message: 'Farm shared successfully', share_id: result.insertId });
    } catch (error) {
        console.error('Farm sharing error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Change which systems a share covers. Body: { share_id, system_ids: string[] | null }
// (null = every system, including ones added later).
router.put('/systems', async (req, res) => {
    const { share_id, system_ids } = req.body;
    if (!share_id) return res.status(400).json({ error: 'Share ID is required' });
    try {
        const pool = getDatabase();
        const farmId = await farmIdForShare(pool, share_id);
        if (!farmId || !(await canManageFarmSharing(pool, farmId, req.user.userId))) {
            return res.status(403).json({ error: 'Not authorized to modify this share' });
        }
        const selection = await parseSelection(pool, farmId, req.user.userId, system_ids);
        if (!selection.ok) return res.status(400).json({ error: selection.error });
        await applySelection(pool, share_id, selection.ids);
        res.json({ success: true });
    } catch (error) {
        console.error('Farm sharing error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Change a collaborator's permission level (owner only).
router.put('/permission', async (req, res) => {
    const { share_id, permission_level } = req.body;
    if (!share_id || !permission_level) {
        return res.status(400).json({ error: 'Share ID and permission level are required' });
    }
    if (!VALID.includes(permission_level)) {
        return res.status(400).json({ error: 'Invalid permission level' });
    }
    try {
        const pool = getDatabase();
        const farmId = await farmIdForShare(pool, share_id);
        if (!farmId || !(await canManageFarmSharing(pool, farmId, req.user.userId))) {
            return res.status(403).json({ error: 'Not authorized to modify this share' });
        }
        await pool.execute('UPDATE farm_shares SET permission_level = ? WHERE id = ?', [permission_level, share_id]);
        res.json({ success: true, message: 'Permission updated' });
    } catch (error) {
        console.error('Farm sharing error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Remove a collaborator, or cancel a pending email invite (owner only).
router.delete('/access/:share_id', async (req, res) => {
    try {
        const pool = getDatabase();
        const farmId = await farmIdForShare(pool, req.params.share_id);
        if (!farmId || !(await canManageFarmSharing(pool, farmId, req.user.userId))) {
            return res.status(403).json({ error: 'Not authorized to remove this access' });
        }
        await pool.execute('DELETE FROM farm_shares WHERE id = ?', [req.params.share_id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Farm sharing error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
module.exports.applySelection = applySelection;
module.exports.parseSelection = parseSelection;
