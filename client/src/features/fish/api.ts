import { z } from 'zod'
import { api } from '../../lib/apiClient'

const numish = z.union([z.string(), z.number()]).nullable().optional().transform((v) => (v == null || v === '' ? null : Number(v)))

export const fishTankSchema = z.object({
  fish_tank_id: z.number(),
  tank_number: z.coerce.number(),
  volume_liters: numish,
  size_m3: numish,
  tank_fish_type: z.string().nullable().optional(),
  max_stocking_density: numish,
  current_count: numish,
  average_weight: numish,
  biomass_kg: numish,
  density_kg_m3: numish,
  last_updated: z.string().nullable().optional(),
})
export type FishTank = z.infer<typeof fishTankSchema>

const inventorySchema = z.object({
  system_id: z.string(),
  tanks: z.array(fishTankSchema),
})

export async function fetchFishInventory(systemId: string): Promise<FishTank[]> {
  const data = await api<unknown>(`/fish-inventory/system/${systemId}`)
  const parsed = inventorySchema.safeParse(data)
  return parsed.success ? parsed.data.tanks : []
}

// Fish species the backend accepts on a tank.
export const FISH_SPECIES = ['tilapia', 'catfish', 'trout', 'salmon', 'bass', 'other'] as const

// Create or update a tank (POST upserts by system + tank_number). size_m3 is
// derived from the litre volume so the two stay consistent.
export function saveFishTank(systemId: string, t: { tank_number: number; volume_liters: number; fish_type: string }) {
  return api('/fish-tanks', {
    method: 'POST',
    body: {
      system_id: systemId,
      tank_number: t.tank_number,
      size_m3: t.volume_liters / 1000,
      volume_liters: t.volume_liters,
      fish_type: t.fish_type,
    },
  })
}

export function deleteFishTank(systemId: string, tankNumber: number) {
  return api(`/fish-tanks/system/${systemId}/tank/${tankNumber}`, { method: 'DELETE' })
}

const densityPointSchema = z.object({
  date: z.string(),
  density: z.coerce.number(),
  biomass_kg: z.coerce.number().optional(),
})
export type DensityPoint = z.infer<typeof densityPointSchema>

export async function fetchDensityHistory(systemId: string, days = 90): Promise<DensityPoint[]> {
  const data = await api<unknown>(`/fish-inventory/density-history/${systemId}?days=${days}`)
  const parsed = z.object({ series: z.array(densityPointSchema) }).safeParse(data)
  return parsed.success ? parsed.data.series : []
}

// Recommended max stocking density (kg/m³) per species.
const MAX_DENSITY: Record<string, number> = { tilapia: 30, trout: 25, catfish: 35, bass: 25, goldfish: 25, koi: 25 }
export function maxDensityForSpecies(fishType?: string | null): number {
  return MAX_DENSITY[(fishType ?? '').toLowerCase()] ?? 25
}

// The effective max density for a tank: the operator-entered value if set,
// otherwise the species recommendation.
export function tankMaxDensity(tank: Pick<FishTank, 'max_stocking_density' | 'tank_fish_type'>): number {
  return tank.max_stocking_density && tank.max_stocking_density > 0
    ? tank.max_stocking_density
    : maxDensityForSpecies(tank.tank_fish_type)
}
