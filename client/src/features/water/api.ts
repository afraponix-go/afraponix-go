import { z } from 'zod'
import { api } from '../../lib/apiClient'
import { waterQualitySchema, type WaterQuality } from '../dashboard/api'

export type { WaterQuality }

// Recent water-quality readings (newest first from the API).
export async function fetchWaterQualityHistory(systemId: string, limit = 10): Promise<WaterQuality[]> {
  const data = await api<unknown>(`/data/water-quality/${systemId}?limit=${limit}`)
  const rows = Array.isArray(data) ? data : []
  return z.array(waterQualitySchema).parse(rows)
}

// Fields accepted by POST /data/water-quality/:systemId. All optional — the
// backend coerces missing values to null, so partial readings are fine.
export type WaterQualityInput = {
  date?: string
  temperature?: number
  ph?: number
  dissolved_oxygen?: number
  ammonia?: number
  nitrite?: number
  nitrate?: number
  ec?: number
  humidity?: number
  salinity?: number
  notes?: string
}

export async function createWaterQualityReading(systemId: string, input: WaterQualityInput) {
  return api(`/data/water-quality/${systemId}`, { method: 'POST', body: input })
}
