// Seed the global spray product catalog (user_id NULL) from database/spray-catalog.js.
// Idempotent: upsert by the unique product code, so re-running re-syncs the
// catalog (fish-safety, rates, notes) with the module without duplicating rows.

const { getDatabase } = require('../init-mariadb');
const { SPRAY_CATALOG } = require('../spray-catalog');

async function seedSprayCatalog() {
  const pool = getDatabase();
  let wrote = 0;
  for (const p of SPRAY_CATALOG) {
    await pool.execute(
      `INSERT INTO spray_products
         (code, user_id, category, product_name, active_ingredient, target, default_rate, interval_days, fish_safety, fish_note, compatibility_notes)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         category = VALUES(category), product_name = VALUES(product_name), active_ingredient = VALUES(active_ingredient),
         target = VALUES(target), default_rate = VALUES(default_rate), interval_days = VALUES(interval_days),
         fish_safety = VALUES(fish_safety), fish_note = VALUES(fish_note), compatibility_notes = VALUES(compatibility_notes)`,
      [p.code, p.category, p.product_name, p.active_ingredient, p.target, p.default_rate, p.interval_days, p.fish_safety, p.fish_note, p.compatibility_notes]
    );
    wrote++;
  }
  console.log(`✅ Spray catalog seeded: ${wrote} products`);
}

if (require.main === module) {
  seedSprayCatalog()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Spray catalog seed failed:', error.message);
      process.exit(1);
    });
}

module.exports = { seedSprayCatalog };
