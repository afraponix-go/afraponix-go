// Ensure the cherry_tomatoes crop exists in the global crops table, then seed
// its nutrient targets. On some databases (e.g. production) cherry_tomatoes was
// never added to `crops`, so the earlier target seed found no crop row and
// skipped it. This creates the crop (fruiting vegetable) and re-runs the target
// seed. Idempotent: INSERT IGNORE for the crop, upsert for the targets.

const { getDatabase } = require('../init-mariadb');
const { seedCherryTomatoes } = require('./2026-08-crop-target-cherry-tomatoes');

async function ensureCherryTomatoes() {
  const pool = getDatabase();

  const [cats] = await pool.execute('SELECT id FROM crop_categories WHERE code = ?', ['fruiting_vegetables']);
  const categoryId = cats.length ? cats[0].id : null;

  await pool.execute(
    `INSERT IGNORE INTO crops (code, name, category_id, default_ph_min, default_ph_max, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['cherry_tomatoes', 'Cherry Tomatoes', categoryId, 5.8, 6.5, true]
  );

  await seedCherryTomatoes();
  console.log('✅ cherry_tomatoes crop ensured + targets seeded');
}

if (require.main === module) {
  ensureCherryTomatoes()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 cherry_tomatoes crop ensure failed:', error.message);
      process.exit(1);
    });
}

module.exports = { ensureCherryTomatoes };
