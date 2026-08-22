// Seed the aquaponic crop nutrient targets from the ratio-and-floor model
// (database/nutrient-target-model.js), which encodes Afraponix's "Aquaponic
// Crop Nutrient Targets" workbook. Writes one crop_nutrient_targets row per
// (crop, nutrient, stage): leafy crops/herbs get the 'vegetative' stage only,
// fruiting crops get 'vegetative' and 'fruiting'.
//
// Idempotent: upserts on the unique (crop_id, nutrient_id, growth_stage_id) key,
// so re-running (every deploy) re-derives the stored targets from the model
// without duplicating rows. Safe to run with real data present.

const { getDatabase } = require('../init-mariadb');
const { CROP_ANCHORS, computeTargets } = require('../nutrient-target-model');

async function seedCropTargetRatios() {
  const pool = getDatabase();

  const [crops] = await pool.execute('SELECT id, code FROM crops');
  const [nutrients] = await pool.execute('SELECT id, code FROM nutrients');
  const [stages] = await pool.execute('SELECT id, code FROM growth_stages');

  const cropId = Object.fromEntries(crops.map((c) => [c.code, c.id]));
  const nutrientId = Object.fromEntries(nutrients.map((n) => [n.code, n.id]));
  const stageId = Object.fromEntries(stages.map((s) => [s.code, s.id]));

  for (const stage of ['vegetative', 'fruiting']) {
    if (!stageId[stage]) throw new Error(`Missing growth_stage '${stage}' — run crop-knowledge tables first`);
  }

  let wrote = 0;
  let skipped = 0;
  for (const { code, stage, anchorN } of CROP_ANCHORS) {
    const cid = cropId[code];
    if (!cid) {
      console.warn(`⚠️  crop '${code}' not in crops table — skipping`);
      skipped++;
      continue;
    }
    const targets = computeTargets(anchorN, stage);
    for (const [nutrientCode, { target, floor }] of Object.entries(targets)) {
      const nid = nutrientId[nutrientCode];
      if (!nid) {
        console.warn(`⚠️  nutrient '${nutrientCode}' not in nutrients table — skipping`);
        continue;
      }
      await pool.execute(
        `INSERT INTO crop_nutrient_targets (crop_id, nutrient_id, growth_stage_id, target_value, min_value, max_value)
         VALUES (?, ?, ?, ?, ?, NULL)
         ON DUPLICATE KEY UPDATE target_value = VALUES(target_value), min_value = VALUES(min_value), max_value = VALUES(max_value)`,
        [cid, nid, stageId[stage], target, floor],
      );
      wrote++;
    }
  }

  console.log(`✅ Crop target ratios seeded: ${wrote} target rows across ${CROP_ANCHORS.length} crop-stages (${skipped} crops skipped)`);
}

if (require.main === module) {
  seedCropTargetRatios()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Crop target ratio seed failed:', error.message);
      process.exit(1);
    });
}

module.exports = { seedCropTargetRatios };
