import { z } from 'zod'
import { api } from '../../lib/apiClient'

// Water-quality parameters, all stored in nutrient_readings (the single source
// of truth). Field defs are shared by the form and the history table.
export const WATER_FIELDS = [
  { key: 'ph', label: 'pH', unit: '', step: '0.1', range: '6.0 - 8.5' },
  { key: 'kh', label: 'KH / Alkalinity', unit: 'dKH', step: '0.5', range: '2 - 8' },
  { key: 'ec', label: 'EC / TDS', unit: 'ppm', step: '10', range: '400 - 1200' },
  { key: 'dissolved_oxygen', label: 'Dissolved O₂', unit: 'mg/L', step: '0.1', range: '5.0 - 8.0' },
  { key: 'temperature', label: 'Water Temp', unit: '°C', step: '0.1', range: '18 - 30' },
  { key: 'humidity', label: 'Humidity', unit: '%', step: '1', range: '40 - 80' },
  { key: 'salinity', label: 'Salinity', unit: 'ppt', step: '0.1', range: '0 - 1.0' },
  { key: 'ammonia', label: 'Ammonia (NH₃)', unit: 'ppm', step: '0.01', range: '< 0.5' },
  { key: 'nitrite', label: 'Nitrite (NO₂)', unit: 'ppm', step: '0.01', range: '< 0.5' },
  { key: 'nitrate', label: 'Nitrate (NO₃)', unit: 'ppm', step: '1', range: '10 - 150' },
  { key: 'iron', label: 'Iron (Fe)', unit: 'ppm', step: '0.1', range: '1 - 3' },
  { key: 'potassium', label: 'Potassium (K)', unit: 'ppm', step: '1', range: '40 - 70' },
  { key: 'calcium', label: 'Calcium (Ca)', unit: 'ppm', step: '1', range: '50 - 100' },
  { key: 'phosphorus', label: 'Phosphorus (P)', unit: 'ppm', step: '0.1', range: '5 - 20' },
  { key: 'magnesium', label: 'Magnesium (Mg)', unit: 'ppm', step: '0.1', range: '12 - 18' },
] as const

// Every trackable metric key (the master list a system chooses from).
export const ALL_METRIC_KEYS: string[] = WATER_FIELDS.map((f) => f.key)

// A system stores tracked_metrics as a JSON array string; null/absent means
// "track everything". Returns the set of enabled metric keys.
export function parseTrackedMetrics(raw: string | null | undefined): Set<string> {
  if (raw == null) return new Set(ALL_METRIC_KEYS)
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return new Set(arr.filter((k): k is string => typeof k === 'string'))
  } catch {
    // fall through to "all"
  }
  return new Set(ALL_METRIC_KEYS)
}

export type WaterFieldKey = (typeof WATER_FIELDS)[number]['key']

// ---- Write: one reading = several typed rows in nutrient_readings ----
export type WaterQualityInput = { date: string; notes?: string; values: Partial<Record<WaterFieldKey, number>> }

// Delete all readings for a system on one day (a "reading" is a day's composite).
export function deleteWaterQualityDay(systemId: string, date: string) {
  return api(`/data/nutrients/${systemId}/day/${date}`, { method: 'DELETE' })
}

export async function createWaterQualityReading(systemId: string, input: WaterQualityInput) {
  // Store at noon so a reader's timezone offset can't shift the date to an
  // adjacent day when the datetime is later grouped by calendar date.
  const readingDate = `${input.date} 12:00:00`
  const nutrients = WATER_FIELDS.filter((f) => input.values[f.key] != null).map((f, i) => ({
    type: f.key,
    value: input.values[f.key],
    unit: f.unit,
    reading_date: readingDate,
    source: 'manual',
    ...(i === 0 && input.notes ? { notes: input.notes } : {}),
  }))
  return api(`/data/nutrients/${systemId}`, { method: 'POST', body: { nutrients } })
}

// ---- Read: pivot the normalized readings into one row per date ----
const readingRow = z.object({
  nutrient_type: z.string(),
  value: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  reading_date: z.string(),
})
export type HistoryRow = { date: string } & Partial<Record<WaterFieldKey, number>>

export async function fetchWaterQualityHistory(systemId: string, days = 12): Promise<HistoryRow[]> {
  const data = await api<unknown[]>(`/data/nutrients/${systemId}?limit=500`)
  const rows = z.array(readingRow).safeParse(data)
  if (!rows.success) return []

  const keys = new Set(WATER_FIELDS.map((f) => f.key as string))
  const byDate = new Map<string, HistoryRow>()
  for (const r of rows.data) {
    if (!keys.has(r.nutrient_type)) continue
    const date = r.reading_date.slice(0, 10)
    const row = byDate.get(date) ?? { date }
    // readings come newest-first, so keep the first (latest) value we see per day
    if ((row as Record<string, unknown>)[r.nutrient_type] == null) {
      ;(row as unknown as Record<string, number>)[r.nutrient_type] = r.value
    }
    byDate.set(date, row)
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, days)
}
