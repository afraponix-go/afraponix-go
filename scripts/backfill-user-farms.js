// Ensure every user owns at least one farm. Idempotent — creates a default
// farm only for users who have none (e.g. accounts made before signup started
// creating one). Safe to re-run.
require('dotenv').config();
const { getDatabase } = require('../database/init-mariadb');
const { ensureUserFarm } = require('../utils/farms');

async function run() {
  const pool = getDatabase();
  const [users] = await pool.query(
    'SELECT u.id, u.email FROM users u WHERE NOT EXISTS (SELECT 1 FROM farms f WHERE f.owner_id = u.id)'
  );
  let created = 0;
  for (const u of users) {
    try { await ensureUserFarm(pool, u.id); created++; }
    catch (e) { console.error(`  ✗ ${u.email}: ${e.message}`); }
  }
  console.log(`✅ Ensured a farm for ${created}/${users.length} farmless user(s).`);
}

run().then(() => process.exit(0)).catch((e) => { console.error('💥 Backfill failed:', e.message); process.exit(1); });
