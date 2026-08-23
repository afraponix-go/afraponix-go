import { api } from '../../lib/apiClient'

export type NutrientKey = 'n' | 'p' | 'k' | 'ca' | 'mg' | 'fe'

// --- Fertiliser catalogue (dosing_products) ---
export type Fertiliser = {
  id?: number
  name: string
  n: number; p: number; k: number; ca: number; mg: number; fe: number
  rate_amount?: number | null
  rate_unit?: string | null
  rate_per_volume?: number | null
}
export async function fetchFertilisers(): Promise<Fertiliser[]> {
  const d = await api<{ products: Fertiliser[] | null }>('/dosing/products')
  return d.products ?? []
}
export type AddFertiliserInput = {
  name: string
  n?: number | null; p?: number | null; k?: number | null; ca?: number | null; mg?: number | null; fe?: number | null
  rate_amount?: number | null; rate_unit?: string | null; rate_per_volume?: number | null
}
export const addFertiliser = (input: AddFertiliserInput) =>
  api<{ product: Fertiliser | null }>('/dosing/products', { method: 'POST', body: input })

// --- Dosing programmes (target-band maintenance) ---
export type DosingTarget = { id?: number; nutrient: NutrientKey; target_value: number | null; product: string | null; days: string[] }
export type DosingProgramme = { id: number; name: string; notes: string | null; status: 'active' | 'paused'; targets: DosingTarget[] }

export async function fetchDosingProgrammes(systemId: string): Promise<DosingProgramme[]> {
  const d = await api<{ programmes: DosingProgramme[] }>(`/dosing/programmes/${systemId}`)
  return d.programmes
}
export type DosingProgrammeInput = {
  name: string
  notes?: string | null
  status?: 'active' | 'paused'
  targets: { nutrient: string; target_value: number | null; product: string | null; days: string[] }[]
}
export const createDosingProgramme = (systemId: string, input: DosingProgrammeInput) =>
  api(`/dosing/programmes/${systemId}`, { method: 'POST', body: input })
export const updateDosingProgramme = (id: number, input: Partial<DosingProgrammeInput>) =>
  api(`/dosing/programmes/${id}`, { method: 'PUT', body: input })
export const deleteDosingProgramme = (id: number) =>
  api(`/dosing/programmes/${id}`, { method: 'DELETE' })
export const setDosingProgrammeStatus = (id: number, status: 'active' | 'paused') =>
  api(`/dosing/programmes/${id}`, { method: 'PUT', body: { status } })

export const NUTRIENT_OPTS: { key: NutrientKey; label: string; short: string }[] = [
  { key: 'n', label: 'Nitrogen (N)', short: 'N' },
  { key: 'p', label: 'Phosphorus (P)', short: 'P' },
  { key: 'k', label: 'Potassium (K)', short: 'K' },
  { key: 'ca', label: 'Calcium (Ca)', short: 'Ca' },
  { key: 'mg', label: 'Magnesium (Mg)', short: 'Mg' },
  { key: 'fe', label: 'Iron (Fe)', short: 'Fe' },
]
export const nutrientShort = (k: string) => NUTRIENT_OPTS.find((o) => o.key === k)?.short ?? k.toUpperCase()

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
export const WEEKDAY_LABEL: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
