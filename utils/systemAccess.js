const { getDatabase } = require('../database/init-mariadb');

// Share permission levels that may modify a system's data generally. 'view' is
// read-only. 'operator' is NOT here — it's a narrower level that may only
// perform specific capture actions (logging, scanning), checked separately via
// CAPTURE_LEVELS/canCaptureSystem/canCaptureFarm. Keeping it out of WRITE_LEVELS
// means every existing and future write-gated route is safe from operators by
// default — only routes explicitly switched to a capture check accept them.
const WRITE_LEVELS = new Set(['collaborator', 'admin']);
// Levels that may perform a capture action: full-write levels, plus operator.
const CAPTURE_LEVELS = new Set(['operator', 'collaborator', 'admin']);
// Ordering so we can take the most permissive of several grants.
const LEVEL_RANK = { view: 1, operator: 2, collaborator: 3, admin: 4, owner: 5 };
const bestLevel = (...levels) =>
    levels.filter(Boolean).sort((a, b) => (LEVEL_RANK[b] || 0) - (LEVEL_RANK[a] || 0))[0] || null;

// Resolve a user's access to a farm.
// Returns { level } — 'owner' for the farm owner, otherwise an accepted
// farm_shares permission_level — or null for no access.
async function getFarmAccess(farmId, userId, pool = getDatabase()) {
    if (!farmId) return null;
    const [owned] = await pool.execute('SELECT 1 FROM farms WHERE id = ? AND owner_id = ?', [farmId, userId]);
    if (owned.length) return { level: 'owner' };
    const [shared] = await pool.execute(
        "SELECT permission_level FROM farm_shares WHERE farm_id = ? AND shared_with_id = ? AND status = 'accepted' LIMIT 1",
        [farmId, userId]
    );
    if (shared.length) return { level: shared[0].permission_level };
    return null;
}

// Resolve a user's access to a system.
// Returns { level } — 'owner' for the owner, otherwise the most permissive of a
// farm-level share (the system's farm) and a per-system share ('view' |
// 'collaborator' | 'admin') — or null for no access.
async function getSystemAccess(systemId, userId, pool = getDatabase()) {
    // Owner: either the system's own user_id (legacy/creator) OR the owner of the
    // farm the system belongs to. Keying ownership off the farm decouples it from
    // systems.user_id (farm staff, systems moved between farms).
    const [rows] = await pool.execute(
        `SELECT s.farm_id, (s.user_id = ? OR f.owner_id = ?) AS is_owner
         FROM systems s LEFT JOIN farms f ON f.id = s.farm_id WHERE s.id = ?`,
        [userId, userId, systemId]
    );
    if (!rows.length) return null;
    if (rows[0].is_owner) return { level: 'owner' };
    const farmId = rows[0].farm_id;

    // Farm-level share (grants access to every system in the farm) …
    const [fshare] = farmId
        ? await pool.execute(
              "SELECT permission_level FROM farm_shares WHERE farm_id = ? AND shared_with_id = ? AND status = 'accepted' LIMIT 1",
              [farmId, userId]
          )
        : [[]];
    // … and any legacy per-system share (still honoured).
    const [sshare] = await pool.execute(
        "SELECT permission_level FROM system_shares WHERE system_id = ? AND shared_with_id = ? AND status = 'accepted' LIMIT 1",
        [systemId, userId]
    );

    const level = bestLevel(fshare[0]?.permission_level, sshare[0]?.permission_level);
    return level ? { level } : null;
}

// Can the user see the system at all (owner or any accepted share)?
async function canReadSystem(systemId, userId, pool) {
    return (await getSystemAccess(systemId, userId, pool)) !== null;
}

// Can the user modify the system's data (owner, admin- or collaborator-level share)?
async function canWriteSystem(systemId, userId, pool) {
    const access = await getSystemAccess(systemId, userId, pool);
    return access !== null && (access.level === 'owner' || WRITE_LEVELS.has(access.level));
}

// Can the user perform a CAPTURE action on the system (log a reading, act on a
// scanned batch/tank, add a photo)? Same as canWriteSystem but also admits
// 'operator'. Use this ONLY on the specific routes that are safe for a
// restricted operator account — never as a general replacement for
// canWriteSystem, or every write-gated route quietly opens up to operators.
async function canCaptureSystem(systemId, userId, pool) {
    const access = await getSystemAccess(systemId, userId, pool);
    return access !== null && (access.level === 'owner' || CAPTURE_LEVELS.has(access.level));
}

// Farm-level equivalent of canWriteSystem/canCaptureSystem, for the handful of
// routes (seedlings) that check farm access directly rather than per-system.
async function canWriteFarm(farmId, userId, pool) {
    const access = await getFarmAccess(farmId, userId, pool);
    return access !== null && (access.level === 'owner' || WRITE_LEVELS.has(access.level));
}
async function canCaptureFarm(farmId, userId, pool) {
    const access = await getFarmAccess(farmId, userId, pool);
    return access !== null && (access.level === 'owner' || CAPTURE_LEVELS.has(access.level));
}

// Convenience: read when write is falsy, write otherwise.
async function canAccessSystem(systemId, userId, { write = false } = {}, pool) {
    return write ? canWriteSystem(systemId, userId, pool) : canReadSystem(systemId, userId, pool);
}

// True if `recordedBy` is this user AND `dateStr` (a 'YYYY-MM-DD' string, or
// anything whose first 10 characters are one, e.g. a DATETIME) is today (UTC).
// Gates an operator's edit/delete to their own same-day entries — see the
// Operator Access boundary "delete a record that isn't their own, from today".
// Full-write levels (collaborator/admin/owner) never need this check.
function isOwnEntryToday(recordedBy, userId, dateStr) {
    if (recordedBy == null || Number(recordedBy) !== Number(userId)) return false;
    const today = new Date().toISOString().slice(0, 10);
    return String(dateStr || '').slice(0, 10) === today;
}

module.exports = {
    getSystemAccess, getFarmAccess, canReadSystem, canWriteSystem, canCaptureSystem,
    canWriteFarm, canCaptureFarm, canAccessSystem, isOwnEntryToday, WRITE_LEVELS, CAPTURE_LEVELS,
};
