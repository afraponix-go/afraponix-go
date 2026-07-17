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
  value: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  reading_date: z.string(),
})

export type SeriesPoint = { date: string; label: string; value: number }

export async function fetchSeries(systemId: string, type: string, limit = 60): Promise<SeriesPoint[]> {
  const data = await api<unknown[]>(`/data/nutrients/${systemId}?nutrient_type=${type}&limit=${limit}`)
  const rows = z.array(reading).safeParse(data)
  if (!rows.success) return []
  return rows.data
    .map((r) => {
      const d = new Date(r.reading_date)
      return { date: r.reading_date, label: `${d.getMonth() + 1}/${d.getDate()}`, value: r.value }
    })
    .filter((p) => Number.isFinite(p.value))
    .sort((a, b) => a.date.localeCompare(b.date)) // oldest -> newest for the x-axis
}
