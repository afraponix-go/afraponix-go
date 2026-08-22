#!/usr/bin/env node
/**
 * Bring a database up to a complete, ready-to-run schema.
 *
 * The server's own startup only creates the core tables (init-mariadb.js). The
 * reference data — crops, nutrients, the knowledge base, seed varieties — plus
 * every schema migration lives in separate scripts that were historically run by
 * hand, so a fresh database ended up missing tables the app writes to. This runs
 * all of it, in dependency order, in one command:
 *
 *     npm run db:bootstrap
 *
 * Each step is applied once and recorded in a schema_migrations ledger, so a
 * redeploy re-applies only new steps (and is otherwise a near-instant no-op).
 * The core schema still runs every time (idempotent). Steps should still be
 * written idempotently as a safety net. BOOTSTRAP_FORCE=1 re-runs every step.
 *
 * Deliberately excluded: demo/sample data and diagnostics (create-demo-data.js,
 * simple-demo-creator.js, *-diagnostic.js, populate-sample-*). Demo content is
 * created per-user through the app's "create demo system" feature.
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const mysql = require('mysql2/promise');

const ROOT = path.join(__dirname, '..');

// Load .env directly (like server.js does). In production this runs via a plain
// `npm run db:bootstrap`, without the `dotenv -e` CLI wrapper the dev/staging
// npm scripts use, so read it here. Non-overriding: an explicit `dotenv -e`
// (dev/staging) still takes precedence over these values.
require('dotenv').config({ path: path.join(ROOT, '.env') });

// Ordered on purpose — not globbed. Later steps depend on tables created by
// earlier ones (crops/nutrients before anything with a foreign key to them).
const STEPS = [
  // Reference schema: crops, crop_categories, nutrients, knowledge base.
  { type: 'node', file: 'database/create-crop-knowledge-table.js', label: 'Crop + nutrient reference tables' },
  // The base crop list itself (INSERT IGNORE). Must run before the migrations
  // below, which update and extend these rows.
  { type: 'node', file: 'database/migrate-crop-knowledge-data.js', label: 'Crop knowledge data' },
  // Deficiency images (FK -> nutrients, users).
  { type: 'node', file: 'database/create-nutrient-info-tables.js', label: 'Nutrient info tables' },
  // Calculator tables (FK -> crops, nutrients).
  { type: 'node', file: 'database/create-nutrient-calculator-tables.js', label: 'Nutrient calculator tables' },
  // Seed variety list: the table plus the lettuce cultivars, then the remaining
  // varieties (kale, spinach, basil, celery, leeks, spring onion).
  { type: 'sql', file: 'database/seed-varieties.sql', label: 'Seed varieties table' },
  { type: 'node', file: 'database/migrate-seed-varieties.js', label: 'Seed variety data' },
  // Column additions (need crops + systems to exist for their foreign keys).
  { type: 'node', file: 'database/add-plant-id-to-deficiency-images.js', label: 'Deficiency image links' },
  { type: 'node', file: 'database/add-nutrient-type-flag.js', label: 'Nutrient type flag' },
  { type: 'node', file: 'database/add-verification-code-column.js', label: 'Email verification column' },

  // Migrations, oldest first. Explicit rather than sorted so the order is
  // reviewable — filename sorting would run add_custom_crops_* last, after the
  // migrations that build on custom_crops.
  { type: 'sql', file: 'database/migrations/add_custom_crops_enhanced_fields.sql', label: 'Custom crop fields' },
  { type: 'sql', file: 'database/migrations/2026-07-crop-reference-data.sql', label: 'Crop reference data' },
  { type: 'sql', file: 'database/migrations/2026-07-crop-extras-and-variety-merge.sql', label: 'Extra crops + variety merge' },
  { type: 'sql', file: 'database/migrations/2026-07-per-user-default-crops.sql', label: 'Per-user default crops' },
  { type: 'sql', file: 'database/migrations/2026-07-per-user-seed-varieties.sql', label: 'Per-user seed varieties' },
  { type: 'sql', file: 'database/migrations/2026-07-system-id-cascade-fks.sql', label: 'Cascading system foreign keys' },
  { type: 'sql', file: 'database/migrations/2026-07-widen-plant-growth-batch-id.sql', label: 'Widen plant_growth batch_id' },
  { type: 'sql', file: 'database/migrations/2026-07-system-tracked-metrics.sql', label: 'Per-system tracked metrics' },
  { type: 'sql', file: 'database/migrations/2026-07-plant-growth-plants-per-m2.sql', label: 'Planting density (plants/m²)' },
  { type: 'sql', file: 'database/migrations/2026-08-fish-tanks-current-fish-count.sql', label: 'fish_tanks.current_fish_count column' },
  { type: 'sql', file: 'database/migrations/2026-08-reconcile-schema-drift.sql', label: 'Reconcile schema drift (missing columns)' },
  { type: 'sql', file: 'database/migrations/2026-08-import-columns.sql', label: 'Import source/session columns' },
  { type: 'sql', file: 'database/migrations/2026-08-user-terms.sql', label: 'User terms acceptance columns' },
  { type: 'sql', file: 'database/migrations/2026-08-user-dosing-products.sql', label: 'Per-user dosing products table' },
  { type: 'node', file: 'database/migrations/2026-08-crop-target-ratios.js', label: 'Aquaponic crop nutrient targets (ratio model, veg/fruiting stages)' },
  { type: 'node', file: 'database/migrations/2026-08-crop-target-cherry-tomatoes.js', label: 'Cherry tomatoes crop targets (tomato anchors)' },
  { type: 'sql', file: 'database/migrations/2026-08-system-crop-targets.sql', label: 'Per-system crop target overrides table' },
  { type: 'node', file: 'database/migrations/2026-07-backfill-nutrient-readings.js', label: 'Backfill nutrient readings' },
  // One-time cleanup of NULL-user seed variety rows that accumulated when the
  // reference-data step re-ran on every deploy (before migration tracking).
  { type: 'sql', file: 'database/migrations/2026-08-dedupe-seed-variety-template.sql', label: 'Dedupe seed variety template' },
];

function dbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'aquaponics',
    password: process.env.DB_PASSWORD || 'dev123',
    database: process.env.DB_NAME || 'aquaponics_dev',
  };
}

// Wait for the database to accept connections — on a fresh deploy the server can
// come up before the database container is ready.
async function waitForDatabase(attempts = 20, delayMs = 1500) {
  const cfg = dbConfig();
  for (let i = 1; i <= attempts; i++) {
    try {
      const c = await mysql.createConnection(cfg);
      await c.end();
      return;
    } catch (error) {
      if (i === attempts) {
        throw new Error(`Database not reachable at ${cfg.host}:${cfg.port} (${cfg.database}): ${error.message}`);
      }
      process.stdout.write(`   …waiting for database (${i}/${attempts})\r`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

// Run a .sql file. multipleStatements lets a migration file run as a whole.
async function runSqlFile(absPath) {
  const sql = fs.readFileSync(absPath, 'utf8');
  const connection = await mysql.createConnection({ ...dbConfig(), multipleStatements: true });
  try {
    await connection.query(sql);
  } finally {
    await connection.end();
  }
}

// Run a .js script as a child process: these scripts call process.exit() when
// executed directly, which would otherwise kill this runner.
function runNodeScript(absPath) {
  const result = spawnSync(process.execPath, [absPath], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
    throw new Error(`exited with code ${result.status}\n${output}`);
  }
  return result.stdout || '';
}

// The steps below are applied once and recorded in this table, so a redeploy is
// a near-instant no-op instead of re-running (and re-seeding) everything.
async function ensureMigrationsTable(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(255) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

async function main() {
  const cfg = dbConfig();
  console.log(`\n🌱 Bootstrapping ${cfg.database} at ${cfg.host}:${cfg.port}\n`);

  await waitForDatabase();

  // 1. Core schema — the same routine the server runs at startup. Always run:
  //    it is idempotent (CREATE TABLE IF NOT EXISTS) and cheap, and guarantees
  //    the base tables exist regardless of the migration ledger's state.
  console.log('→ Core schema (init-mariadb)');
  const { initializeDatabase } = require(path.join(ROOT, 'database/init-mariadb'));
  await initializeDatabase();

  // 2. Everything the server does not create on its own — each step applied once
  //    and recorded in schema_migrations. Set BOOTSTRAP_FORCE=1 to re-run every
  //    step (e.g. to re-seed reference data after editing a seed script).
  const force = !!process.env.BOOTSTRAP_FORCE;
  const tracker = await mysql.createConnection(dbConfig());
  try {
    await ensureMigrationsTable(tracker);
    const [rows] = await tracker.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    let step = 1;
    for (const { type, file, label } of STEPS) {
      const absPath = path.join(ROOT, file);
      const tag = `[${String(step).padStart(2, '0')}/${STEPS.length}]`;
      step++;

      if (!force && applied.has(file)) {
        console.log(`${tag} ⏭  ${label} — already applied`);
        continue;
      }
      if (!fs.existsSync(absPath)) {
        console.log(`${tag} ⏭  ${label} — skipped, ${file} not found`);
        continue;
      }

      try {
        if (type === 'sql') {
          await runSqlFile(absPath);
        } else {
          runNodeScript(absPath);
        }
        await tracker.query('INSERT IGNORE INTO schema_migrations (name) VALUES (?)', [file]);
        console.log(`${tag} ✅ ${label}`);
      } catch (error) {
        console.error(`${tag} ❌ ${label} (${file})`);
        console.error(`      ${error.message}`);
        throw new Error(`Bootstrap failed at: ${file}`);
      }
    }
  } finally {
    await tracker.end();
  }

  console.log('\n✅ Database ready.\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\n❌ ${error.message}\n`);
    process.exit(1);
  });
