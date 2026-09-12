// Top up a freshly-imported demo system with data for the areas the SQLite
// importer predates: Operations (spray + dosing programmes on the unified
// `programmes`/`programme_items` tables, PLUS a couple of weeks of actually
// recorded history for them — a schedule with nothing ever logged against it
// reads as a neglected farm, not a working one) and Seedlings. Best-effort
// and idempotent-ish (guarded by existence checks) so re-runs don't
// duplicate.

const WEEKDAY_NAME = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

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

  let sprayProgrammeId = null;
  const sprayItems = []; // { id, spray_product_id, product_name, rate, weekdays, quantity, unit }
  const [sprayEx] = await pool.execute("SELECT id FROM programmes WHERE system_id = ? AND type = 'spray' LIMIT 1", [systemId]);
  if (!sprayEx.length) {
    const [sp] = await pool.execute(
      "INSERT INTO programmes (system_id, type, name, status, start_date) VALUES (?, 'spray', 'Weekly IPM', 'active', ?)",
      [systemId, start]
    );
    sprayProgrammeId = sp.insertId;
    const sprayDefs = [
      { productId: productIds[0], name: 'Neem Oil', rate: '5 ml/L', weekdays: 'mon,thu', quantity: 350, unit: 'ml' },
      { productId: productIds[1], name: 'Bacillus thuringiensis', rate: '2 g/L', weekdays: 'wed', quantity: 140, unit: 'g' },
    ];
    let sort = 0;
    for (const d of sprayDefs) {
      const [it] = await pool.execute(
        "INSERT INTO programme_items (programme_id, spray_product_id, rate, schedule_kind, weekdays, sort_order) VALUES (?, ?, ?, 'weekdays', ?, ?)",
        [sprayProgrammeId, d.productId, d.rate, d.weekdays, sort++]
      );
      sprayItems.push({ id: it.insertId, spray_product_id: d.productId, product_name: d.name, rate: d.rate, weekdays: d.weekdays, quantity: d.quantity, unit: d.unit });
    }
  } else {
    sprayProgrammeId = sprayEx[0].id;
  }

  // --- Dosing: a programme with a few nutrient targets on a weekly schedule. ---
  let dosingProgrammeId = null;
  const dosingItems = []; // { id, nutrient, label, weekdays, amount, unit }
  const [doseEx] = await pool.execute("SELECT id FROM programmes WHERE system_id = ? AND type = 'dosing' LIMIT 1", [systemId]);
  if (!doseEx.length) {
    const [dp] = await pool.execute(
      "INSERT INTO programmes (system_id, type, name, status, start_date) VALUES (?, 'dosing', 'Weekly feed', 'active', ?)",
      [systemId, start]
    );
    dosingProgrammeId = dp.insertId;
    const targets = [
      { n: 'n', label: 'Nitrogen', value: 120, amount: 3200, days: 'mon,thu', fertiliser: 'Calcium Nitrate', before: 68, delta: 45 },
      { n: 'k', label: 'Potassium', value: 210, amount: 1500, days: 'tue,fri', fertiliser: 'Potassium Sulphate', before: 140, delta: 55 },
      { n: 'ca', label: 'Calcium', value: 90, amount: 2100, days: 'wed', fertiliser: 'Calcium Nitrate', before: 58, delta: 28 },
    ];
    let sort = 0;
    for (const t of targets) {
      const [it] = await pool.execute(
        `INSERT INTO programme_items (programme_id, target_nutrient, target_value, label, dose_amount, dose_unit, schedule_kind, weekdays, sort_order)
         VALUES (?, ?, ?, ?, ?, 'g', 'weekdays', ?, ?)`,
        [dosingProgrammeId, t.n, t.value, t.label, t.amount, t.days, sort++]
      );
      dosingItems.push({ id: it.insertId, nutrient: t.n, weekdays: t.days, amount: t.amount, fertiliser: t.fertiliser, before: t.before, delta: t.delta });
    }
  } else {
    dosingProgrammeId = doseEx[0].id;
  }

  // --- Log history: the last ~2.5 weeks of scheduled occurrences, actually
  // recorded, so the Operations Log/Calendar show a farm that's being run —
  // not just a schedule nobody's ever followed. The most recent 2-3 days are
  // deliberately left unrecorded so "due today" still has something to show.
  const operatorName = 'Sam';
  for (let daysAgo = 20; daysAgo >= 3; daysAgo--) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const wd = WEEKDAY_NAME[d.getDay()];
    const dateStr = isoDaysAgo(daysAgo);

    for (const item of sprayItems) {
      if (!item.weekdays.split(',').includes(wd)) continue;
      const [ex] = await pool.execute("SELECT id FROM programme_log WHERE system_id = ? AND type = 'spray' AND item_id = ? AND event_date = ?", [systemId, item.id, dateStr]);
      if (ex.length) continue;
      await pool.execute(
        `INSERT INTO programme_log (system_id, programme_id, item_id, type, spray_product_id, product_name, scope, event_date, rate, quantity, quantity_unit, effectiveness, operator_name, notes)
         VALUES (?, ?, ?, 'spray', ?, ?, 'system', ?, ?, ?, ?, ?, ?, ?)`,
        [systemId, sprayProgrammeId, item.id, item.spray_product_id, item.product_name, dateStr, item.rate, item.quantity, item.unit, 4, operatorName, 'Demo data']
      );
    }

    for (const item of dosingItems) {
      if (!item.weekdays.split(',').includes(wd)) continue;
      const [ex] = await pool.execute("SELECT id FROM programme_log WHERE system_id = ? AND type = 'dosing' AND item_id = ? AND event_date = ?", [systemId, item.id, dateStr]);
      if (ex.length) continue;
      // A small realistic day-to-day wobble so the reading isn't identical
      // every occurrence, and a same-day re-test showing partial recovery.
      const before = item.before + (daysAgo % 3) - 1;
      const after = before + Math.round(item.delta * 0.85);
      await pool.execute(
        `INSERT INTO programme_log (system_id, programme_id, item_id, type, event_date, target_nutrient, product_name, quantity, quantity_unit, reading_before, reading_after, expected_delta, retest_date, operator_name, notes)
         VALUES (?, ?, ?, 'dosing', ?, ?, ?, ?, 'g', ?, ?, ?, ?, ?, ?)`,
        [systemId, dosingProgrammeId, item.id, dateStr, item.nutrient, item.fertiliser, item.amount, before, after, item.delta, dateStr, operatorName, 'Demo data']
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
