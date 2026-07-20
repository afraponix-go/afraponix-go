import { z } from 'zod'
import { api } from '../../lib/apiClient'

// Parameters we can chart — all live in nutrient_readings now.
export type Chartable = { key: string; label: string; unit: string; min?: number; max?: number }

export const CHARTABLE: Chartable[] = [
  { key: 'temperature', label: 'Water Temp', unit: '°C', min: 18, max: 30 },
  { key: 'ph', label: 'pH', unit: '', min: 6, max: 7.6 },
  { key: 'dissolved_oxygen', label: 'Dissolved O₂', unit: 'mg/L', min: 5 },
  { key: 'ammonia', label: 'Ammonia', unit: 'ppm', max: 1 },
  { key: 'nitrite', label: 'Nitrite', unit: 'ppm', max: 1 },
  { key: 'nitrate', label: 'Nitrate', unit: 'ppm', min: 10, max: 150 },
  { key: 'ec', label: 'EC', unit: 'µS/cm', min: 400, max: 1200 },
  { key: 'humidity', label: 'Humidity', unit: '%', min: 40, max: 80 },
  { key: 'salinity', label: 'Salinity', unit: 'ppt', max: 1 },
  { key: 'potassium', label: 'Potassium (K)', unit: 'mg/L' },
  { key: 'calcium', label: 'Calcium (Ca)', unit: 'mg/L' },
  { key: 'magnesium', label: 'Magnesium (Mg)', unit: 'mg/L' },
  { key: 'iron', label: 'Iron (Fe)', unit: 'mg/L' },
  { key: 'phosphorus', label: 'Phosphorus (P)', unit: 'mg/L' },
]

const reading = z.object({
  id: z.coerce.number().optional(),
  value: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  reading_date: z.string(),
})

export type SeriesPoint = { date: string; label: string; value: number }

export async function fetchSeries(systemId: string, type: string, limit = 120): Promise<SeriesPoint[]> {
  const data = await api<unknown[]>(`/data/nutrients/${systemId}?nutrient_type=${type}&limit=${limit}`)
  const rows = z.array(reading).safeParse(data)
  if (!rows.success) return []

  // One point per calendar day, using that day's most recent reading. When two
  // readings share a timestamp, the higher id wins (inserted last) so the chart
  // matches the "latest" value shown on the dashboard.
  const byDay = new Map<string, SeriesPoint & { _id: number }>()
  for (const r of rows.data) {
    if (!Number.isFinite(r.value)) continue
    const day = r.reading_date.slice(0, 10)
    const id = r.id ?? 0
    const existing = byDay.get(day)
    const newer = !existing || r.reading_date > existing.date || (r.reading_date === existing.date && id > existing._id)
    if (newer) {
      const d = new Date(r.reading_date)
      byDay.set(day, { date: r.reading_date, label: `${d.getMonth() + 1}/${d.getDate()}`, value: r.value, _id: id })
    }
  }
  return [...byDay.values()]
    .map(({ _id, ...p }) => p)
    .sort((a, b) => a.date.localeCompare(b.date)) // oldest -> newest for the x-axis
}
