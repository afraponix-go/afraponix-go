// Top up a freshly-imported demo system with data for the areas the SQLite
// importer predates: Operations (spray + dosing programmes on the unified
// `programmes`/`programme_items` tables) and Seedlings. Best-effort and
// idempotent-ish (guarded by existence checks) so re-runs don't duplicate.

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function enrichDemoSystem(pool, systemId, userId, farmId) {
  const start = isoDaysAgo(21); // a few weeks back, so schedules have fired

  // --- Spray: ensure the user has a couple of catalogue products, then a
  // programme that schedules them across the week. ---
  const productDefs = [
    { code: `demo-neem-${userId}`, category: 'insecticide', product_name: 'Neem Oil', active_ingredient: 'Azadirachtin', target: 'Aphids, whitefly, spider mite', default_rate: '5 ml/L', interval_days: 7, fish_safety: 'caution', fish_note: 'Divert or cover the sump while spraying; keep off the water surface.' },
    { code: `demo-bt-${userId}`, category: 'insecticide', product_name: 'Bacillus thuringiensis', active_ingredient: 'Bt kurstaki', target: 'Caterpillars, loopers', default_rate: '2 g/L', interval_days: 7, fish_safety: 'safe', fish_note: null },
  ];
  const productIds = [];
  for (const p of productDefs) {
    const [ex] = await pool.execute('SELECT id FROM spray_products WHERE user_id = ? AND code = ? LIMIT 1', [userId, p.code]);
    if (ex.length) { productIds.push(ex[0].id); continue; }
    const [r] = await pool.execute(
      `INSERT INTO spray_products (code, user_id, category, product_name, active_ingredient, target, default_rate, interval_days, fish_safety, fish_note, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [p.code, userId, p.category, p.product_name, p.active_ingredient, p.target, p.default_rate, p.interval_days, p.fish_safety, p.fish_note]
    );
    productIds.push(r.insertId);
  }

  const [sprayEx] = await pool.execute("SELECT id FROM programmes WHERE system_id = ? AND type = 'spray' LIMIT 1", [systemId]);
  if (!sprayEx.length) {
    const [sp] = await pool.execute(
      "INSERT INTO programmes (system_id, type, name, status, start_date) VALUES (?, 'spray', 'Weekly IPM', 'active', ?)",
      [systemId, start]
    );
    await pool.execute(
      "INSERT INTO programme_items (programme_id, spray_product_id, rate, schedule_kind, weekdays, sort_order) VALUES (?, ?, ?, 'weekdays', 'mon,thu', 0)",
      [sp.insertId, productIds[0], '5 ml/L']
    );
    await pool.execute(
      "INSERT INTO programme_items (programme_id, spray_product_id, rate, schedule_kind, weekdays, sort_order) VALUES (?, ?, ?, 'weekdays', 'wed', 1)",
      [sp.insertId, productIds[1], '2 g/L']
    );
  }

  // --- Dosing: a programme with a few nutrient targets on a weekly schedule. ---
  const [doseEx] = await pool.execute("SELECT id FROM programmes WHERE system_id = ? AND type = 'dosing' LIMIT 1", [systemId]);
  if (!doseEx.length) {
    const [dp] = await pool.execute(
      "INSERT INTO programmes (system_id, type, name, status, start_date) VALUES (?, 'dosing', 'Weekly feed', 'active', ?)",
      [systemId, start]
    );
    const targets = [
      { n: 'n', label: 'Nitrogen', value: 120, amount: 3200, days: 'mon,thu' },
      { n: 'k', label: 'Potassium', value: 210, amount: 1500, days: 'tue,fri' },
      { n: 'ca', label: 'Calcium', value: 90, amount: 2100, days: 'wed' },
    ];
    let sort = 0;
    for (const t of targets) {
      await pool.execute(
        `INSERT INTO programme_items (programme_id, target_nutrient, target_value, label, dose_amount, dose_unit, schedule_kind, weekdays, sort_order)
         VALUES (?, ?, ?, ?, ?, 'g', 'weekdays', ?, ?)`,
        [dp.insertId, t.n, t.value, t.label, t.amount, t.days, sort++]
      );
    }
  }

  // --- Seedlings: a couple of nursery batches (farm-level nursery). ---
  const [seedEx] = await pool.execute('SELECT id FROM seedling_batches WHERE system_id = ? LIMIT 1', [systemId]);
  if (!seedEx.length) {
    const seedlings = [
      { code: 'lettuce', name: 'Lettuce', variety: 'Butter — Analora', trays: 4, cells: 200, germ: 3, transplant: 21, sow: isoDaysAgo(6) },
      { code: 'basil', name: 'Basil', variety: 'Genovese', trays: 2, cells: 128, germ: 5, transplant: 28, sow: isoDaysAgo(2) },
    ];
    for (const s of seedlings) {
      await pool.execute(
        `INSERT INTO seedling_batches (system_id, farm_id, crop_code, crop_name, seed_variety, sow_date, trays, cells_per_tray, predicted_germ_days, predicted_transplant_days, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nursery')`,
        [systemId, farmId ?? null, s.code, s.name, s.variety, s.sow, s.trays, s.cells, s.germ, s.transplant]
      );
    }
  }
}

module.exports = { enrichDemoSystem };
