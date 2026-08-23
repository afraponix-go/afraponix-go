// Fold each user's fertiliser JSON (user_dosing_products.products) into the
// normalised dosing_products table. Idempotent: INSERT IGNORE on (user_id, name)
// so a re-run never duplicates, and rows edited later (with a dose) are not
// clobbered. Rate columns stay NULL on backfill (the JSON never had them).
const { getDatabase } = require('../init-mariadb');

const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

async function backfillDosingProducts() {
  const pool = getDatabase();
  const [t] = await pool.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user_dosing_products' LIMIT 1"
  );
  if (!t.length) { console.log('ℹ user_dosing_products not found — nothing to backfill.'); return; }

  const [rows] = await pool.query('SELECT user_id, products FROM user_dosing_products');
  let processed = 0;
  for (const r of rows) {
    let list = [];
    try { list = JSON.parse(r.products) || []; } catch { list = []; }
    if (!Array.isArray(list)) continue;
    for (const pr of list) {
      if (!pr || !pr.name) continue;
      await pool.execute(
        `INSERT IGNORE INTO dosing_products (user_id, name, n, p, k, ca, mg, fe)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.user_id, String(pr.name).slice(0, 120), num(pr.n), num(pr.p), num(pr.k), num(pr.ca), num(pr.mg), num(pr.fe)]
      );
      processed++;
    }
  }
  console.log(`✅ dosing_products backfill: ${processed} product row(s) processed.`);
}

if (require.main === module) {
  backfillDosingProducts()
    .then(() => process.exit(0))
    .catch((error) => { console.error('💥 dosing_products backfill failed:', error.message); process.exit(1); });
}

module.exports = { backfillDosingProducts };
