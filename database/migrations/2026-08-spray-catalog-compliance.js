// Re-seed the catalogue so existing global products pick up the new compliance
// fields (phi_days, resistance_group). The main catalogue seed is applied-once
// and tracked; this re-runs the same idempotent upsert to backfill them.
const { seedSprayCatalog } = require('./2026-08-spray-catalog-seed');

if (require.main === module) {
  seedSprayCatalog()
    .then(() => process.exit(0))
    .catch((error) => { console.error('💥 Spray catalogue compliance re-seed failed:', error.message); process.exit(1); });
}

module.exports = { seedSprayCatalogCompliance: seedSprayCatalog };
