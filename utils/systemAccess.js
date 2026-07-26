const { getDatabase } = require('../database/init-mariadb');

// Share permission levels that may modify a system's data. 'view' is read-only.
const WRITE_LEVELS = new Set(['collaborator', 'admin']);

// Resolve a user's access to a system.
// Returns { level } — 'owner' for the owner, otherwise the accepted share's
// permission_level ('view' | 'collaborator' | 'admin') — or null for no access.
async function getSystemAccess(systemId, userId, pool = getDatabase()) {
    const [owned] = await pool.execute(
        'SELECT 1 FROM systems WHERE id = ? AND user_id = ?',
        [systemId, userId]
    );
    if (owned.length) return { level: 'owner' };

    const [shared] = await pool.execute(
        "SELECT permission_level FROM system_shares WHERE system_id = ? AND shared_with_id = ? AND status = 'accepted' LIMIT 1",
        [systemId, userId]
    );
    if (shared.length) return { level: shared[0].permission_level };

    return null;
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

module.exports = { getSystemAccess, canReadSystem, canWriteSystem, canAccessSystem };
