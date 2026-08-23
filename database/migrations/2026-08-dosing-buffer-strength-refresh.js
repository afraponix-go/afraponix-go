// Bump pH-buffer strengths that are still sitting at the original (too-low)
// seed defaults up to the revised concentrated-product / ~KH-4 defaults. The
// first defaults under-dosed acid ~30× (a flat ml/1000L/pH slope ignoring
// alkalinity); the client seed was fixed, but buffers already loaded into a
// user's catalogue kept the old strength.
//
// Matched on (name, exact old strength) so a value a user has deliberately
// calibrated is never overwritten — only untouched seed rows move. Idempotent:
// after the update the row no longer matches the old value, so re-running is a
// no-op. Safe with real data.

const { getDatabase } = require('../init-mariadb');

// [name, old default strength, new default strength]
const BUMPS = [
  ['Nitric Acid', 2, 55],
  ['Phosphoric Acid', 1.5, 50],
  ['Hydrochloric Acid', 2, 65],
  ['Potassium Hydroxide', 1.5, 35],
  ['Calcium Hydroxide', 2, 25],
];

async function refreshBufferStrengths() {
  const pool = getDatabase();
  let updated = 0;
  for (const [name, oldVal, newVal] of BUMPS) {
    const [res] = await pool.execute(
      `UPDATE dosing_products SET ph_strength = ?
       WHERE ph_direction IS NOT NULL AND name = ? AND ph_strength = ?`,
      [newVal, name, oldVal],
    );
    updated += res.affectedRows || 0;
  }
  console.log(`✅ pH-buffer strengths refreshed: ${updated} row(s) bumped from old seed defaults`);
}

if (require.main === module) {
  refreshBufferStrengths()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Buffer strength refresh failed:', error.message);
      process.exit(1);
    });
}

module.exports = { refreshBufferStrengths };
