import { z } from 'zod'
import { api } from '../../lib/apiClient'

const numish = z.union([z.string(), z.number()]).nullable().optional().transform((v) => (v == null || v === '' ? null : Number(v)))

export const growBedSchema = z.object({
  id: z.number(),
  bed_name: z.string().nullable().optional(),
  bed_type: z.string().nullable().optional(),
  equivalent_m2: numish,
  total_allocated: numish,
  available_percentage: numish,
})
export type GrowBed = z.infer<typeof growBedSchema>

export async function fetchGrowBeds(systemId: string): Promise<GrowBed[]> {
  const data = await api<unknown[]>(`/plants/utilization/${systemId}`)
  const parsed = z.array(growBedSchema).safeParse(data)
  return parsed.success ? parsed.data : []
}

// Full bed configuration (all columns) — needed for allocation capacity math.
export const growBedConfigSchema = z.object({
  id: z.number(),
  bed_number: numish,
  bed_name: z.string().nullable().optional(),
  bed_type: z.string().nullable().optional(),
  equivalent_m2: numish,
  area_m2: numish,
  volume_liters: numish,
  vertical_count: numish,
  plants_per_vertical: numish,
  plant_spacing: numish,
  plant_capacity: numish,
  length_meters: numish,
  width_meters: numish,
  height_meters: numish,
  trough_length: numish,
  trough_count: numish,
})
export type GrowBedConfig = z.infer<typeof growBedConfigSchema>

export async function fetchGrowBedConfigs(systemId: string): Promise<GrowBedConfig[]> {
  const data = await api<unknown[]>(`/grow-beds/system/${systemId}`)
  const parsed = z.array(growBedConfigSchema).safeParse(data)
  return parsed.success ? parsed.data : []
}

// Full bed config payload. The single-bed PUT binds every column, so all keys
// must be present (null when unused) to avoid undefined-bind errors.
export type BedConfigPayload = {
  bed_number: number
  bed_type: string
  bed_name: string
  volume_liters: number | null
  area_m2: number | null
  equivalent_m2: number | null
  length_meters: number | null
  width_meters: number | null
  height_meters: number | null
  plant_capacity: number | null
  vertical_count: number | null
  plants_per_vertical: number | null
  reservoir_volume: number | null
  trough_length: number | null
  trough_count: number | null
  plant_spacing: number | null
  reservoir_volume_liters: number | null
}

export function saveBedConfig(systemId: string, bedNumber: number, cfg: BedConfigPayload) {
  return api(`/grow-beds/bed/${systemId}/${bedNumber}`, { method: 'PUT', body: cfg })
}

export function deleteBed(bedId: number) {
  return api(`/grow-beds/${bedId}`, { method: 'DELETE' })
}
