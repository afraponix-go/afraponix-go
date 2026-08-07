import { api } from '../../lib/apiClient'
import { getToken } from '../../lib/token'

// ---- Export: pull existing /data/* records and build a CSV in the browser ----

export type ExportType = 'water_quality' | 'nutrients' | 'fish_health' | 'plant_growth' | 'operations'

export const EXPORT_TYPES: { value: ExportType; label: string; path: string }[] = [
  { value: 'water_quality', label: 'Water quality', path: 'water-quality' },
  { value: 'nutrients', label: 'Nutrients', path: 'nutrients' },
  { value: 'fish_health', label: 'Fish health', path: 'fish-health' },
  { value: 'plant_growth', label: 'Plant growth', path: 'plant-growth' },
  { value: 'operations', label: 'Operations', path: 'operations' },
]

// The /data/* endpoints return either an array or { <something>: [...] }.
function asRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (data && typeof data === 'object') {
    const arr = Object.values(data as Record<string, unknown>).find((v) => Array.isArray(v))
    if (Array.isArray(arr)) return arr as Record<string, unknown>[]
  }
  return []
}

// Best-effort date field for optional range filtering.
function rowDate(row: Record<string, unknown>): string | null {
  const v = row.date ?? row.reading_date ?? row.created_at ?? row.import_date
  return v == null ? null : String(v).slice(0, 10)
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Array.from(rows.reduce((set, r) => {
    Object.keys(r).forEach((k) => set.add(k))
    return set
  }, new Set<string>()))
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n')
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Fetch a type's records, optionally filter by date range, return the row count
// exported (0 = nothing to export).
export async function exportCsv(
  type: ExportType,
  systemId: string,
  range: { from?: string; to?: string } = {},
): Promise<number> {
  const def = EXPORT_TYPES.find((t) => t.value === type)!
  const data = await api<unknown>(`/data/${def.path}/${systemId}`)
  let rows = asRows(data)
  if (range.from) rows = rows.filter((r) => { const d = rowDate(r); return !d || d >= range.from! })
  if (range.to) rows = rows.filter((r) => { const d = rowDate(r); return !d || d <= range.to! })
  if (rows.length === 0) return 0
  const stamp = new Date().toISOString().slice(0, 10)
  download(new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' }), `${type}_${stamp}.csv`)
  return rows.length
}

// ---- Import: server-side (templates, upload, history, undo) ----

export type ImportType = 'water_quality' | 'nutrients' | 'water_nutrients' | 'fish_health'

export const IMPORT_TYPES: { value: ImportType; label: string }[] = [
  { value: 'water_quality', label: 'Water quality' },
  { value: 'nutrients', label: 'Nutrients' },
  { value: 'water_nutrients', label: 'Water quality + nutrients' },
  { value: 'fish_health', label: 'Fish health' },
]

// Templates and uploads aren't JSON, so go straight to fetch with the JWT.
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  return fetch(`/api${path}`, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  })
}

export async function downloadTemplate(type: ImportType, systemId: string): Promise<void> {
  const res = await authFetch(`/import/sample/${type}?systemId=${encodeURIComponent(systemId)}&format=csv`)
  if (!res.ok) throw new Error(`Could not download the template (${res.status}).`)
  download(await res.blob(), `${type}_template.csv`)
}

export type ImportResult = {
  success: boolean
  imported: number
  errors: number
  duplicates?: number
  message: string
  historyId?: number | null
  errorDetails?: string[]
  moreErrors?: string
}

export async function importFile(type: ImportType, systemId: string, file: File): Promise<ImportResult> {
  const form = new FormData()
  form.append('dataFile', file)
  form.append('systemId', systemId)
  const res = await authFetch(`/import/${type}`, { method: 'POST', body: form })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && (data.error || data.message)) || `Import failed (${res.status}).`)
  return data as ImportResult
}

export type ImportHistoryRow = {
  id: number
  import_type: string
  file_name?: string | null
  records_imported: number
  records_errors: number
  records_duplicates: number
  import_date?: string | null
  total_records?: number
}

export async function fetchImportHistory(systemId: string): Promise<ImportHistoryRow[]> {
  const data = await api<unknown>(`/import/history/${systemId}`)
  if (Array.isArray(data)) return data as ImportHistoryRow[]
  const arr = data && typeof data === 'object' ? Object.values(data).find(Array.isArray) : null
  return (arr as ImportHistoryRow[]) ?? []
}

export async function undoImport(historyId: number): Promise<void> {
  await api(`/import/undo/${historyId}`, { method: 'DELETE' })
}
