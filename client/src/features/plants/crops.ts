import { z } from 'zod'
import { api } from '../../lib/apiClient'

const numish = z.union([z.string(), z.number()]).nullable().optional().transform((v) => (v == null || v === '' ? null : Number(v)))

export type CropOption = {
  value: string
  label: string
  days_to_harvest: number | null
  plant_spacing_cm: number | null
  custom: boolean
}

// Fallback planting density when a crop has no spacing set: 20×20 cm = 25/m².
export const DEFAULT_PLANTS_PER_M2 = 25

// Plants per m² from a square spacing in cm (20 cm → 25/m²).
export function plantsPerM2FromSpacing(spacingCm?: number | null): number | null {
  if (!spacingCm || spacingCm <= 0) return null
  const perRow = 100 / spacingCm
  return Math.round(perRow * perRow)
}

// The equivalent square spacing (cm) for a given density — for display only.
export function spacingFromPlantsPerM2(density?: number | null): number | null {
  if (!density || density <= 0) return null
  return Math.round((100 / Math.sqrt(density)) * 10) / 10
}

const userCropSchema = z.object({
  crop_code: z.string().nullable().optional(),
  crop_name: z.string(),
  growth_days: numish,
  plant_spacing: numish,
})

// The crop options for planting/allocation come from the user's own crop list
// (their per-user copy of the defaults + any crops they added). The stored
// crop identifier (crop_code) keeps plant_growth/seed_variety keys stable.
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

export async function fetchCropOptions(systemId: string): Promise<CropOption[]> {
  const data = await api<unknown>(`/custom-crops/system/${systemId}`).catch(() => null)
  const parsed = z.array(userCropSchema).safeParse(data)
  if (!parsed.success) return []
  return parsed.data
    .map((c) => ({
      value: c.crop_code || slug(c.crop_name),
      label: c.crop_name,
      days_to_harvest: c.growth_days,
      plant_spacing_cm: c.plant_spacing,
      custom: true,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
