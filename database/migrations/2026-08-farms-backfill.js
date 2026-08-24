// Backfill the farm layer (Phase 1): give every user who owns systems a default
// farm and point their systems at it. A shared system belongs to its OWNER's
// farm (we group by systems.user_id) — shared users keep access via system_shares.
//
// Idempotent: only touches systems whose farm_id is still NULL, and ensureUserFarm
// reuses an existing farm rather than creating a second one — so re-running on
// every deploy is a no-op once everything is assigned. Safe with real data.

const { getDatabase } = require('../init-mariadb');
const { ensureUserFarm } = require('../../utils/farms');

async function backfillFarms() {
    const pool = getDatabase();
    const [owners] = await pool.execute('SELECT DISTINCT user_id FROM systems WHERE farm_id IS NULL');
    let assigned = 0;
    for (const { user_id } of owners) {
        const farmId = await ensureUserFarm(pool, user_id);
        const [res] = await pool.execute(
            'UPDATE systems SET farm_id = ? WHERE user_id = ? AND farm_id IS NULL',
            [farmId, user_id],
        );
        assigned += res.affectedRows || 0;
    }
    console.log(`✅ Farms backfill: ${assigned} system(s) across ${owners.length} owner(s) assigned to a default farm`);
}

if (require.main === module) {
    backfillFarms().then(() => process.exit(0)).catch((e) => { console.error('💥 Farms backfill failed:', e.message); process.exit(1); });
}

module.exports = { backfillFarms };
