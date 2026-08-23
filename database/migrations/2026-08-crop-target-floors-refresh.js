// Re-derive every stored crop_nutrient_targets row from the updated ratio model
// (database/nutrient-target-model.js) after the Aug-2026 workbook lowered the
// calcium and magnesium floors (veg Ca 50→45 / Mg 25→20; fruiting Ca 70→60 /
// Mg 25→20).
//
// The original ratio seed (2026-08-crop-target-ratios.js) is ledgered as
// already-applied, so it never re-runs on deploy — this separate one-shot step
// forces a fresh re-derive. It just calls the same idempotent seed (upsert on
// the unique crop/nutrient/stage key), so it only rewrites target/min values and
// never duplicates rows. Safe with real data present.

const { seedCropTargetRatios } = require('./2026-08-crop-target-ratios');

async function refreshCropTargetFloors() {
  await seedCropTargetRatios();
}

if (require.main === module) {
  refreshCropTargetFloors()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Crop target floor refresh failed:', error.message);
      process.exit(1);
    });
}

module.exports = { refreshCropTargetFloors };
