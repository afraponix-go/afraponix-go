import { api } from '../../lib/apiClient'

export type FishSafety = 'safe' | 'caution' | 'toxic'

export type SprayProduct = {
  id: number
  code: string
  user_id: number | null
  category: string
  product_name: string
  active_ingredient: string | null
  target: string | null
  default_rate: string | null
  interval_days: number | null
  fish_safety: FishSafety
  fish_note: string | null
  compatibility_notes: string | null
  phi_days: number | null
  resistance_group: string | null
  custom: boolean
}

export type PlanProduct = {
  id: number
  product_id: number
  rate: string | null
  days: string[]
  product_name: string
  category: string
  fish_safety: FishSafety
  fish_note: string | null
  default_rate: string | null
  interval_days: number | null
  active_ingredient: string | null
  target: string | null
}

export type Programme = {
  id: number
  system_id: string
  name: string
  notes: string | null
  start_date: string | null
  end_date: string | null
  status: string
  products: PlanProduct[]
}

export type DueItem = {
  plan_id: number
  plan_name: string
  product_id: number
  product_name: string
  category: string
  fish_safety: FishSafety
  fish_note: string | null
  rate: string | null
  done: boolean
}

export type SprayTarget = { grow_bed_id: number | null; bed_name: string | null; batch_id: string | null; crop_type: string | null }
export type LogEntry = {
  id: number
  plan_id: number | null
  product_id: number | null
  product_name: string | null
  grow_bed_id: number | null
  bed_name: string | null
  scope: string | null
  targets: SprayTarget[]
  application_date: string
  rate: string | null
  quantity: number | string | null
  quantity_unit: string | null
  dilution_value: number | string | null
  dilution_unit: string | null
  phi_days: number | null
  harvest_safe_date: string | null
  weather: string | null
  effectiveness: number | null
  operator: string | null
  notes: string | null
  plan_name: string | null
}

export type SprayCategory = { code: string; label: string }
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export const WEEKDAY_LABEL: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

export async function fetchCategories(): Promise<{ categories: SprayCategory[]; defaultDays: Record<string, string> }> {
  return api('/spray/categories')
}

export async function fetchProducts(): Promise<SprayProduct[]> {
  const d = await api<{ products: SprayProduct[] }>('/spray/products')
  return d.products
}

export type ProductInput = Partial<Pick<SprayProduct, 'category' | 'product_name' | 'active_ingredient' | 'target' | 'default_rate' | 'interval_days' | 'fish_safety' | 'fish_note' | 'compatibility_notes' | 'phi_days' | 'resistance_group'>>
export const addProduct = (input: ProductInput) => api('/spray/products', { method: 'POST', body: input })
export const updateProduct = (id: number, input: ProductInput) => api(`/spray/products/${id}`, { method: 'PUT', body: input })
export const deleteProduct = (id: number) => api(`/spray/products/${id}`, { method: 'DELETE' })

export async function fetchProgrammes(systemId: string): Promise<Programme[]> {
  const d = await api<{ programmes: Programme[] }>(`/spray/programmes/${systemId}`)
  return d.programmes
}

export type ProgrammeInput = {
  name: string
  notes?: string | null
  start_date?: string | null
  end_date?: string | null
  status?: string
  products: { product_id: number; rate?: string | null; days: string[] }[]
}
export const createProgramme = (systemId: string, input: ProgrammeInput) => api(`/spray/programmes/${systemId}`, { method: 'POST', body: input })
export const updateProgramme = (id: number, input: ProgrammeInput) => api(`/spray/programmes/${id}`, { method: 'PUT', body: input })
export const deleteProgramme = (id: number) => api(`/spray/programmes/${id}`, { method: 'DELETE' })

export async function fetchLog(systemId: string): Promise<LogEntry[]> {
  const d = await api<{ log: LogEntry[] }>(`/spray/log/${systemId}`)
  return d.log
}
export type LogInput = {
  system_id: string
  plan_id?: number | null
  product_id?: number | null
  product_name?: string | null
  bed_ids?: number[]
  application_date: string
  rate?: string | null
  quantity?: number | null
  quantity_unit?: string | null
  dilution_value?: number | null
  dilution_unit?: string | null
  weather?: string | null
  effectiveness?: number | null
  operator?: string | null
  notes?: string | null
}
export const recordApplication = (input: LogInput) => api('/spray/log', { method: 'POST', body: input })
export const deleteLog = (id: number) => api(`/spray/log/${id}`, { method: 'DELETE' })
export const rateLogEffectiveness = (id: number, effectiveness: number | null) => api(`/spray/log/${id}`, { method: 'PUT', body: { effectiveness } })
export const setProgrammeStatus = (id: number, status: 'active' | 'paused') => api(`/spray/programmes/${id}`, { method: 'PUT', body: { status } })

export async function fetchDue(systemId: string, date?: string): Promise<{ date: string; due: DueItem[] }> {
  return api(`/spray/due/${systemId}${date ? `?date=${date}` : ''}`)
}

export type CalendarDayItem = { plan_id: number; plan_name: string; product_id: number; product_name: string; category: string; fish_safety: FishSafety; rate: string | null; applied: boolean }
export async function fetchCalendar(systemId: string, year: number, month: number): Promise<{ year: number; month: number; days: Record<string, CalendarDayItem[]> }> {
  return api(`/spray/calendar/${systemId}?year=${year}&month=${month}`)
}

export const FISH_LABEL: Record<FishSafety, string> = { safe: 'Fish-safe', caution: 'Caution', toxic: 'Fish-toxic' }

export type HarvestHold = {
  batch_id: string
  crop_type: string | null
  bed_name: string | null
  grow_bed_id: number | null
  product_name: string | null
  application_date: string
  phi_days: number
  harvest_safe_date: string
  days_remaining: number
}
export async function fetchHarvestHolds(systemId: string): Promise<HarvestHold[]> {
  const d = await api<{ holds: HarvestHold[] }>(`/spray/harvest-holds/${systemId}`)
  return d.holds
}
