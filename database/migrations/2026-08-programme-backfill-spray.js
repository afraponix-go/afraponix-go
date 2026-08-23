// Operations module — fold existing spray data into the unified programme core
// (Phase 1a). Idempotent: programmes and programme_log preserve their source
// ids (INSERT IGNORE on the PK), programme_items is guarded by its unique key,
// and log targets are only inserted for logs that don't yet have any.
//
// No behaviour change — the spray routes still read the old tables until Phase
// 1b. This just mirrors the data across and prints a parity report so we can
// confirm the fold is exact before flipping the switch.
//
// Order matters: items before log (log.item_id looks up the item), log before
// targets (targets reference the preserved log id).

const { getDatabase } = require('../init-mariadb');

async function tableExists(pool, name) {
  const [rows] = await pool.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1',
    [name]
  );
  return rows.length > 0;
}

async function count(pool, sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return Number(rows[0].n) || 0;
}

async function backfillSprayIntoProgrammes() {
  const pool = getDatabase();

  // If the spray tables aren't present yet (brand-new database with no spray
  // history), there is nothing to fold — the unified tables just stay empty.
  for (const t of ['spray_plans', 'spray_plan_products', 'spray_log', 'spray_log_targets']) {
    if (!(await tableExists(pool, t))) {
      console.log(`ℹ ${t} not found — skipping spray backfill (nothing to fold).`);
      return;
    }
  }

  // 1) programmes  ← spray_plans   (id preserved)
  await pool.query(
    `INSERT IGNORE INTO programmes (id, system_id, type, name, notes, status, start_date, end_date, created_at)
     SELECT id, system_id, 'spray', name, notes,
            CASE WHEN status IN ('paused','inactive') THEN 'paused' ELSE 'active' END,
            start_date, end_date, created_at
     FROM spray_plans`
  );

  // 2) programme_items  ← spray_plan_products   (guarded by unique key)
  await pool.query(
    `INSERT IGNORE INTO programme_items (programme_id, spray_product_id, rate, schedule_kind, weekdays, sort_order)
     SELECT plan_id, product_id, rate, 'weekdays', days, 0
     FROM spray_plan_products`
  );

  // 3) programme_log  ← spray_log   (id preserved; item_id looked up)
  await pool.query(
    `INSERT IGNORE INTO programme_log
       (id, system_id, programme_id, item_id, type, event_date, operator_name, product_name, rate, scope,
        quantity, quantity_unit, dilution_value, dilution_unit, weather, effectiveness, phi_days, notes, created_at)
     SELECT sl.id, sl.system_id, sl.plan_id,
            (SELECT pi.id FROM programme_items pi
              WHERE pi.programme_id = sl.plan_id AND pi.spray_product_id = sl.product_id LIMIT 1),
            'spray', sl.application_date, sl.operator, sl.product_name, sl.rate, sl.scope,
            sl.quantity, sl.quantity_unit, sl.dilution_value, sl.dilution_unit,
            sl.weather, sl.effectiveness, sl.phi_days, sl.notes, sl.created_at
     FROM spray_log sl`
  );

  // 4) programme_log_targets  ← spray_log_targets   (log_id aligns; skip logs
  //    that already have targets so a re-run never duplicates).
  await pool.query(
    `INSERT INTO programme_log_targets (log_id, grow_bed_id, bed_name, batch_id, crop_type)
     SELECT slt.log_id, slt.grow_bed_id, slt.bed_name, slt.batch_id, slt.crop_type
     FROM spray_log_targets slt
     WHERE EXISTS (SELECT 1 FROM programme_log pl WHERE pl.id = slt.log_id)
       AND NOT EXISTS (SELECT 1 FROM programme_log_targets t WHERE t.log_id = slt.log_id)`
  );

  // Parity report — source vs mirrored counts. Any mismatch is a red flag.
  const pairs = [
    ['programmes',            "SELECT COUNT(*) n FROM spray_plans",                              "SELECT COUNT(*) n FROM programmes WHERE type='spray'"],
    ['programme_items',       "SELECT COUNT(*) n FROM spray_plan_products",                      "SELECT COUNT(*) n FROM programme_items WHERE spray_product_id IS NOT NULL"],
    ['programme_log',         "SELECT COUNT(*) n FROM spray_log",                                "SELECT COUNT(*) n FROM programme_log WHERE type='spray'"],
    ['programme_log_targets', "SELECT COUNT(*) n FROM spray_log_targets",                        "SELECT COUNT(*) n FROM programme_log_targets"],
  ];
  let ok = true;
  console.log('\n  Parity (source → unified):');
  for (const [label, srcSql, dstSql] of pairs) {
    const src = await count(pool, srcSql);
    const dst = await count(pool, dstSql);
    const match = src === dst;
    ok = ok && match;
    console.log(`   ${match ? '✅' : '❌'} ${label.padEnd(22)} ${src} → ${dst}`);
  }
  // item_id linkage: every spray log that had a matching plan+product should link.
  const orphanItems = await count(
    pool,
    `SELECT COUNT(*) n FROM programme_log pl
      WHERE pl.type='spray' AND pl.item_id IS NULL
        AND EXISTS (SELECT 1 FROM programme_items pi
                    WHERE pi.programme_id = pl.programme_id)`
  );
  if (orphanItems > 0) console.log(`   ⚠ ${orphanItems} spray log rows have a programme but no linked item (product removed from plan?)`);

  if (!ok) throw new Error('Parity mismatch — spray backfill did not mirror exactly.');
  console.log('✅ Spray folded into the unified programme core (parity OK).');
}

if (require.main === module) {
  backfillSprayIntoProgrammes()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Spray→programmes backfill failed:', error.message);
      process.exit(1);
    });
}

module.exports = { backfillSprayIntoProgrammes };
