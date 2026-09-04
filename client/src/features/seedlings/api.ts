import { api } from '../../lib/apiClient'

export type SeedlingStatus = 'sown' | 'germinated' | 'partially_transplanted' | 'transplanted'
export type TrayGroup = { trays: number; cells: number }

export type Seedling = {
  id: number
  system_id: string | null
  crop_code: string | null
  crop_name: string | null
  seed_variety: string | null
  sow_date: string
  trays: number
  cells_per_tray: number
  tray_groups: TrayGroup[]
  total_sown: number
  predicted_germ_days: number | null
  predicted_transplant_days: number | null
  germination_date: string | null
  germinated_count: number | null
  transplant_date: string | null
  transplanted_count: number | null
  grow_bed_id: number | null
  plant_batch_id: string | null
  batch_number: string | null
  status: SeedlingStatus
  notes: string | null
  actual_germ_days: number | null
  predicted_transplant_date: string | null
  days_to_transplant_remaining: number | null
  actual_transplant_days: number | null
}

// Seedlings live in the farm's nursery (one bay per farm), keyed by farm id.
export async function fetchSeedlings(farmId: string): Promise<Seedling[]> {
  const d = await api<{ seedlings: Seedling[] }>(`/seedlings/${farmId}`)
  return d.seedlings
}

export type SowInput = {
  crop_code?: string | null
  crop_name?: string | null
  seed_variety?: string | null
  sow_date: string
  tray_groups?: TrayGroup[]
  predicted_germ_days?: number | null
  predicted_transplant_days?: number | null
  notes?: string | null
}
export const createSeedling = (farmId: string, input: SowInput) => api(`/seedlings/${farmId}`, { method: 'POST', body: input })
export const updateSeedling = (id: number, input: Partial<SowInput> & { germination_date?: string | null; germinated_count?: number | null }) =>
  api(`/seedlings/${id}`, { method: 'PUT', body: input })
export const deleteSeedling = (id: number) => api(`/seedlings/${id}`, { method: 'DELETE' })

export type TransplantInput = { system_id: string; grow_bed_id: number; transplant_date: string; transplanted_count: number; plants_per_m2?: number | null; days_to_harvest?: number | null }
export const transplantSeedling = (id: number, input: TransplantInput) => api(`/seedlings/${id}/transplant`, { method: 'POST', body: input })

// % germination from the counts.
export function germPct(s: Seedling): number | null {
  if (s.germinated_count == null || !s.total_sown) return null
  return Math.round((s.germinated_count / s.total_sown) * 1000) / 10
}
