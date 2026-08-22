// Add cherry_tomatoes to the crop nutrient targets, reusing the tomato anchors
// (veg 70 / fruiting 60). Separate from the main ratio seed because that seed is
// applied once and tracked — this fills in a crop added afterwards without
// re-running (and potentially overwriting admin-edited) the whole set.
//
// Idempotent: cherry_tomatoes has no target rows yet, and the upsert re-derives
// them from the model on any re-run.

const { getDatabase } = require('../init-mariadb');
const { CROP_ANCHORS, computeTargets } = require('../nutrient-target-model');

async function seedCherryTomatoes() {
  const pool = getDatabase();

  const [crops] = await pool.execute('SELECT id, code FROM crops WHERE code = ?', ['cherry_tomatoes']);
  if (crops.length === 0) {
    console.warn('⚠️  crop cherry_tomatoes not in crops table — skipping');
    return;
  }
  const cropId = crops[0].id;

  const [nutrients] = await pool.execute('SELECT id, code FROM nutrients');
  const [stages] = await pool.execute('SELECT id, code FROM growth_stages');
  const nutrientId = Object.fromEntries(nutrients.map((n) => [n.code, n.id]));
  const stageId = Object.fromEntries(stages.map((s) => [s.code, s.id]));

  let wrote = 0;
  for (const { code, stage, anchorN } of CROP_ANCHORS.filter((a) => a.code === 'cherry_tomatoes')) {
    void code;
    const targets = computeTargets(anchorN, stage);
    for (const [nutrientCode, { target, floor }] of Object.entries(targets)) {
      const nid = nutrientId[nutrientCode];
      if (!nid || !stageId[stage]) continue;
      await pool.execute(
        `INSERT INTO crop_nutrient_targets (crop_id, nutrient_id, growth_stage_id, target_value, min_value, max_value)
         VALUES (?, ?, ?, ?, ?, NULL)
         ON DUPLICATE KEY UPDATE target_value = VALUES(target_value), min_value = VALUES(min_value), max_value = VALUES(max_value)`,
        [cropId, nid, stageId[stage], target, floor],
      );
      wrote++;
    }
  }
  console.log(`✅ cherry_tomatoes crop targets seeded: ${wrote} rows`);
}

if (require.main === module) {
  seedCherryTomatoes()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 cherry_tomatoes target seed failed:', error.message);
      process.exit(1);
    });
}

module.exports = { seedCherryTomatoes };
