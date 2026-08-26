const { getDatabase } = require('../database/init-mariadb');

// Share permission levels that may modify a system's data. 'view' is read-only.
const WRITE_LEVELS = new Set(['collaborator', 'admin']);
// Ordering so we can take the most permissive of several grants.
const LEVEL_RANK = { view: 1, collaborator: 2, admin: 3, owner: 4 };
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

// Convenience: read when write is falsy, write otherwise.
async function canAccessSystem(systemId, userId, { write = false } = {}, pool) {
    return write ? canWriteSystem(systemId, userId, pool) : canReadSystem(systemId, userId, pool);
}

module.exports = { getSystemAccess, getFarmAccess, canReadSystem, canWriteSystem, canAccessSystem, WRITE_LEVELS };
