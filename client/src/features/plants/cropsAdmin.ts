import { z } from 'zod'
import { api } from '../../lib/apiClient'

const numish = z.union([z.string(), z.number()]).nullable().optional().transform((v) => (v == null || v === '' ? null : Number(v)))

// ---- Reference crops (crop-knowledge) ----
export const refCropSchema = z.object({
  code: z.string(),
  name: z.string(),
  category_name: z.string().nullable().optional(),
  days_to_harvest: numish,
  plant_spacing_cm: numish,
  default_ec_min: numish,
  default_ec_max: numish,
  light_requirements: z.string().nullable().optional(),
  nutrient_targets_count: numish,
})
export type RefCrop = z.infer<typeof refCropSchema>

export async function fetchReferenceCrops(): Promise<RefCrop[]> {
  const data = await api<unknown>('/crop-knowledge/crops')
  const parsed = z.object({ data: z.array(refCropSchema) }).safeParse(data)
  return parsed.success ? parsed.data.data.slice().sort((a, b) => a.name.localeCompare(b.name)) : []
}

// ---- Custom crops (user-defined) ----
export const customCropSchema = z.object({
  id: z.number(),
  crop_name: z.string(),
  target_n: numish,
  target_p: numish,
  target_k: numish,
  target_ca: numish,
  target_mg: numish,
  target_fe: numish,
  target_ec: numish,
  category: z.string().nullable().optional(),
  plant_spacing: numish,
  growth_days: numish,
  difficulty: z.string().nullable().optional(),
  season: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})
export type CustomCrop = z.infer<typeof customCropSchema>

export async function fetchCustomCrops(systemId: string): Promise<CustomCrop[]> {
  const data = await api<unknown>(`/custom-crops/system/${systemId}`)
  const parsed = z.array(customCropSchema).safeParse(data)
  return parsed.success ? parsed.data.slice().sort((a, b) => a.crop_name.localeCompare(b.crop_name)) : []
}

export type CustomCropInput = {
  cropName: string
  category?: string
  plantSpacing?: number
  growthDays?: number
  difficulty?: string
  targetN?: number
  targetP?: number
  targetK?: number
  targetCa?: number
  targetMg?: number
  targetFe?: number
  targetEc?: number
}

export function saveCustomCrop(input: CustomCropInput) {
  return api('/plants/custom-crops', { method: 'POST', body: input })
}
export function updateCustomCrop(id: number, input: CustomCropInput) {
  return api(`/plants/custom-crops/${id}`, { method: 'PUT', body: input })
}
export function deleteCustomCrop(id: number) {
  return api(`/plants/custom-crops/${id}`, { method: 'DELETE' })
}

// ---- Seed varieties ----
export const seedVarietySchema = z.object({ id: z.number(), crop_type: z.string(), variety_name: z.string() })
export type SeedVariety = z.infer<typeof seedVarietySchema>

export async function fetchSeedVarieties(): Promise<SeedVariety[]> {
  const data = await api<unknown>('/seed-varieties/')
  const parsed = z.object({ varieties: z.record(z.string(), z.array(seedVarietySchema)) }).safeParse(data)
  if (!parsed.success) return []
  return Object.values(parsed.data.varieties).flat().sort((a, b) => a.crop_type.localeCompare(b.crop_type) || a.variety_name.localeCompare(b.variety_name))
}

export function addSeedVariety(cropType: string, varietyName: string) {
  return api('/seed-varieties/', { method: 'POST', body: { crop_type: cropType, variety_name: varietyName } })
}
export function deleteSeedVariety(id: number) {
  return api(`/seed-varieties/${id}`, { method: 'DELETE' })
}
