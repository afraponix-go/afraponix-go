import { api } from '../../lib/apiClient'

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export const WEEKDAY_LABEL: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

export type OperatingTask = { id: number; label: string; weekdays: string[]; est_minutes: number | null }
export type OperatingProgramme = {
  id: number
  name: string
  notes: string | null
  status: 'active' | 'paused'
  created_at?: string | null
  tasks: OperatingTask[]
}

export async function fetchOperatingProgrammes(systemId: string): Promise<OperatingProgramme[]> {
  const d = await api<{ programmes: OperatingProgramme[] }>(`/operating/programmes/${systemId}`)
  return d.programmes
}

export type OperatingTaskInput = { label: string; weekdays: string[]; est_minutes?: number | null }
export type OperatingProgrammeInput = { name: string; notes?: string | null; status?: 'active' | 'paused'; tasks: OperatingTaskInput[] }

export const createOperatingProgramme = (systemId: string, input: OperatingProgrammeInput) =>
  api(`/operating/programmes/${systemId}`, { method: 'POST', body: input })
export const updateOperatingProgramme = (id: number, input: OperatingProgrammeInput) =>
  api(`/operating/programmes/${id}`, { method: 'PUT', body: input })
export const setOperatingProgrammeStatus = (id: number, status: 'active' | 'paused') =>
  api(`/operating/programmes/${id}`, { method: 'PUT', body: { status } })
export const deleteOperatingProgramme = (id: number) =>
  api(`/operating/programmes/${id}`, { method: 'DELETE' })

// --- Today's tasks (the operator Today list's data source) ---
export type DueStatus = 'open' | 'done' | 'skipped'
export type DueTask = {
  programme_id: number
  programme_name: string
  item_id: number
  label: string
  est_minutes: number | null
  status: DueStatus
  log_id: number | null
  operator_name: string | null
}

export async function fetchOperatingDue(systemId: string, date?: string): Promise<{ date: string; due: DueTask[] }> {
  return api(`/operating/due/${systemId}${date ? `?date=${date}` : ''}`)
}

export const logOperatingTask = (systemId: string, itemId: number, status: 'done' | 'skipped', notes?: string) =>
  api<{ success: boolean; id: number }>('/operating/log', { method: 'POST', body: { system_id: systemId, item_id: itemId, status, notes } })

export const undoOperatingLog = (logId: number) =>
  api(`/operating/log/${logId}`, { method: 'DELETE' })

export type OperatingLogRow = {
  id: number
  item_id: number | null
  programme_id: number | null
  event_date: string
  status: 'done' | 'skipped'
  operator_name: string | null
  notes: string | null
  label: string | null
}
export async function fetchOperatingLog(systemId: string): Promise<OperatingLogRow[]> {
  const d = await api<{ log: OperatingLogRow[] }>(`/operating/log/${systemId}`)
  return d.log
}
