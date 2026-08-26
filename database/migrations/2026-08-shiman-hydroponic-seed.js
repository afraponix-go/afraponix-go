// Add "Shiman Hydroponic" (K7952) to every user's fertiliser catalogue as a
// default. Composition from the label (g/kg → %): N 6.4, P 4.3, K 23.8, Mg 2.6,
// Fe 0.168. Idempotent: only inserts where the user doesn't already have it.
const { getDatabase } = require('../init-mariadb');

const SHIMAN = { name: 'Shiman Hydroponic', n: 6.4, p: 4.3, k: 23.8, ca: 0, mg: 2.6, fe: 0.168 };

async function seedShiman() {
  const pool = getDatabase();
  const [t] = await pool.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'dosing_products' LIMIT 1"
  );
  if (!t.length) { console.log('ℹ dosing_products not found — skipping Shiman seed.'); return; }

  const [users] = await pool.query('SELECT id FROM users');
  let added = 0;
  for (const u of users) {
    const [has] = await pool.execute(
      'SELECT 1 FROM dosing_products WHERE user_id = ? AND name = ? LIMIT 1',
      [u.id, SHIMAN.name]
    );
    if (has.length) continue;
    await pool.execute(
      `INSERT INTO dosing_products (user_id, name, n, p, k, ca, mg, fe) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, SHIMAN.name, SHIMAN.n, SHIMAN.p, SHIMAN.k, SHIMAN.ca, SHIMAN.mg, SHIMAN.fe]
    );
    added++;
  }
  console.log(`✅ Shiman Hydroponic seeded for ${added} user(s).`);
}

if (require.main === module) {
  seedShiman().then(() => process.exit(0)).catch((e) => { console.error('💥 Shiman seed failed:', e.message); process.exit(1); });
}

module.exports = { seedShiman };
