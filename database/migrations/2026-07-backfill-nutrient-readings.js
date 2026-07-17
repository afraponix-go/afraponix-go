#!/usr/bin/env node
/**
 * Backfill: water_quality (wide table) -> nutrient_readings (single source of truth).
 *
 * Each non-null column of every water_quality row becomes a typed row in
 * nutrient_readings, UNLESS a reading of that type already exists for the same
 * system on the same day (the old app dual-wrote the chemistry params, so those
 * already exist — only the missing ones, e.g. temperature/ph/DO/humidity/salinity,
 * get inserted). Idempotent: safe to run repeatedly.
 *
 * After this runs and the app reads/writes only nutrient_readings, water_quality
 * can be retired.
 *
 * Usage: node database/migrations/2026-07-backfill-nutrient-readings.js
 */
const mysql = require('mysql2/promise')

// column in water_quality -> [nutrient_type, unit]
const PARAMS = {
  ph: ['ph', ''],
  ec: ['ec', 'µS/cm'],
  dissolved_oxygen: ['dissolved_oxygen', 'mg/L'],
  temperature: ['temperature', '°C'],
  ammonia: ['ammonia', 'ppm'],
  nitrite: ['nitrite', 'ppm'],
  nitrate: ['nitrate', 'mg/L'],
  iron: ['iron', 'mg/L'],
  potassium: ['potassium', 'mg/L'],
  calcium: ['calcium', 'mg/L'],
  phosphorus: ['phosphorus', 'mg/L'],
  magnesium: ['magnesium', 'mg/L'],
  humidity: ['humidity', '%'],
  salinity: ['salinity', 'ppt'],
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'aquaponics',
    password: process.env.DB_PASSWORD || 'dev123',
    database: process.env.DB_NAME || 'aquaponics_dev',
  })

  let total = 0
  const report = []
  for (const [column, [type, unit]] of Object.entries(PARAMS)) {
    // Insert one reading per water_quality row that has a value for this column,
    // skipping any (system, type, day) that already has a reading.
    const [res] = await conn.execute(
      `INSERT INTO nutrient_readings (system_id, nutrient_type, value, unit, reading_date, source, notes)
       SELECT wq.system_id, ?, wq.${column}, ?,
              CONCAT(DATE(wq.date), ' 12:00:00'),
              'manual', 'backfilled from water_quality'
       FROM water_quality wq
       WHERE wq.${column} IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM nutrient_readings nr
           WHERE nr.system_id = wq.system_id
             AND nr.nutrient_type = ?
             AND DATE(nr.reading_date) = DATE(wq.date)
         )`,
      [type, unit, type],
    )
    total += res.affectedRows
    if (res.affectedRows > 0) report.push(`  ${type}: +${res.affectedRows}`)
  }

  console.log(`✅ Backfill complete — ${total} nutrient_readings rows inserted`)
  if (report.length) console.log(report.join('\n'))
  else console.log('  (nothing to insert — already up to date)')
  await conn.end()
}

main().catch((e) => {
  console.error('❌ Backfill failed:', e.message)
  process.exit(1)
})
