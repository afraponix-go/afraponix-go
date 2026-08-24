const crypto = require('crypto');
const { getDatabase } = require('../database/init-mariadb');

// Non-enumerable farm id, matching the systems.id style (`system_<uuid>`).
const generateFarmId = () => `farm_${crypto.randomUUID()}`;

// Return the user's default (oldest) farm id, creating one if they have none.
// Used by the backfill migration and by system creation so every system always
// has a farm — even before the farm UI exists.
async function ensureUserFarm(pool, userId) {
    const [existing] = await pool.execute(
        'SELECT id FROM farms WHERE owner_id = ? ORDER BY created_at ASC, id ASC LIMIT 1',
        [userId]
    );
    if (existing.length) return existing[0].id;

    const [users] = await pool.execute('SELECT first_name FROM users WHERE id = ?', [userId]);
    const first = users.length ? (users[0].first_name || '').trim() : '';
    const name = first ? `${first}'s Farm` : 'My Farm';
    const id = generateFarmId();
    await pool.execute('INSERT INTO farms (id, owner_id, name) VALUES (?, ?, ?)', [id, userId, name]);
    return id;
}

module.exports = { generateFarmId, ensureUserFarm };
