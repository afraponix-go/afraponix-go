import { api } from '../../lib/apiClient'
import { getToken } from '../../lib/token'
import { WATER_FIELDS } from '../water/api'

// Water quality + nutrients live in ONE table (nutrient_readings), read/written
// via /data/nutrients as typed rows — one row per metric per reading. Import and
// export pivot between that and a wide one-row-per-date CSV. Fish health / plant
// growth / operations keep their own tables.

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

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n')
}

// Minimal CSV parser (handles quoted fields with commas/quotes).
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false }
      else field += c
    } else if (c === '"') inQ = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((f) => f.trim() !== '')) rows.push(row) }
  return rows
}

const METRIC_KEYS = WATER_FIELDS.map((f) => f.key as string)

function asRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (data && typeof data === 'object') {
    const arr = Object.values(data as Record<string, unknown>).find((v) => Array.isArray(v))
    if (Array.isArray(arr)) return arr as Record<string, unknown>[]
  }
  return []
}

function rowDate(row: Record<string, unknown>): string | null {
  const v = row.date ?? row.reading_date ?? row.created_at
  return v == null ? null : String(v).slice(0, 10)
}

// ---- Export ----

export type ExportType = 'water_quality' | 'fish_health' | 'plant_growth' | 'operations'

export const EXPORT_TYPES: { value: ExportType; label: string }[] = [
  { value: 'water_quality', label: 'Water quality' },
  { value: 'fish_health', label: 'Fish health' },
  { value: 'plant_growth', label: 'Plant growth' },
  { value: 'operations', label: 'Operations' },
]

// Water quality: fetch the typed nutrient_readings rows and pivot to one row per
// date with a column per metric — the same data the Water Quality tab shows.
async function exportWaterQuality(systemId: string): Promise<{ headers: string[]; rows: (string | number | null)[][] }> {
  const data = await api<unknown>(`/data/nutrients/${systemId}?limit=100000`)
  const readings = asRows(data)
  const byDate = new Map<string, Record<string, number>>()
  for (const r of readings) {
    const type = String(r.nutrient_type ?? '')
    if (!METRIC_KEYS.includes(type)) continue
    const date = rowDate(r)
    if (!date) continue
    const bucket = byDate.get(date) ?? {}
    if (bucket[type] == null) bucket[type] = Number(r.value) // newest-first: keep latest per day
    byDate.set(date, bucket)
  }
  const headers = ['Date', ...METRIC_KEYS]
  const rows = [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, vals]) => [date, ...METRIC_KEYS.map((k) => (vals[k] ?? null))])
  return { headers, rows }
}

// The other types are already flat records — export their columns as-is.
async function exportFlat(path: string, systemId: string): Promise<{ headers: string[]; rows: (string | number | null)[][] }> {
  const data = await api<unknown>(`/data/${path}/${systemId}`)
  const recs = asRows(data)
  const headers = Array.from(recs.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s }, new Set<string>()))
  const rows = recs.map((r) => headers.map((h) => (r[h] == null ? null : (r[h] as string | number))))
  return { headers, rows }
}

// Returns the number of rows exported (0 = nothing to download).
export async function exportCsv(type: ExportType, systemId: string): Promise<number> {
  const { headers, rows } =
    type === 'water_quality' ? await exportWaterQuality(systemId)
    : type === 'fish_health' ? await exportFlat('fish-health', systemId)
    : type === 'plant_growth' ? await exportFlat('plant-growth', systemId)
    : await exportFlat('operations', systemId)
  if (rows.length === 0) return 0
  const stamp = new Date().toISOString().slice(0, 10)
  download(new Blob([toCSV(headers, rows)], { type: 'text/csv;charset=utf-8' }), `${type}_${stamp}.csv`)
  return rows.length
}

// ---- Import ----

export type ImportType = 'water_quality' | 'fish_health'

export const IMPORT_TYPES: { value: ImportType; label: string }[] = [
  { value: 'water_quality', label: 'Water quality' },
  { value: 'fish_health', label: 'Fish health' },
]

export type ImportResult = {
  success: boolean
  imported: number
  errors: number
  message: string
  errorDetails?: string[]
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  return fetch(`/api${path}`, { ...init, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } })
}

// Water quality template: the wide CSV shape (Date + every metric) with one
// example row, generated locally so it always matches the single-table columns.
function waterQualityTemplate(): string {
  const today = new Date().toISOString().slice(0, 10)
  const example: Record<string, number> = {
    ph: 7.2, ec: 800, dissolved_oxygen: 8.5, temperature: 22, humidity: 60, salinity: 0.8,
    ammonia: 0.1, nitrite: 0.05, nitrate: 10, iron: 1.2, potassium: 45, calcium: 60, phosphorus: 8, magnesium: 15,
  }
  return toCSV(['Date', ...METRIC_KEYS], [[today, ...METRIC_KEYS.map((k) => example[k] ?? '')]])
}

export async function downloadTemplate(type: ImportType, systemId: string): Promise<void> {
  if (type === 'water_quality') {
    download(new Blob([waterQualityTemplate()], { type: 'text/csv;charset=utf-8' }), 'water_quality_template.csv')
    return
  }
  const res = await authFetch(`/import/sample/${type}?systemId=${encodeURIComponent(systemId)}&format=csv`)
  if (!res.ok) throw new Error(`Could not download the template (${res.status}).`)
  download(await res.blob(), `${type}_template.csv`)
}

// Water quality import: parse the wide CSV and write each row through the app's
// own /data/nutrients endpoint (one reading per date) → nutrient_readings.
async function importWaterQualityCsv(systemId: string, file: File): Promise<ImportResult> {
  const table = parseCSV(await file.text())
  if (table.length < 2) return { success: false, imported: 0, errors: 0, message: 'The file has no data rows.' }
  const header = table[0].map((h) => h.trim().toLowerCase())
  const dateIdx = header.findIndex((h) => h === 'date')
  // Map each column to a metric key (exact key match).
  const colKey = header.map((h) => (METRIC_KEYS.includes(h) ? h : null))
  if (dateIdx < 0 || !colKey.some(Boolean)) {
    return { success: false, imported: 0, errors: 0, message: 'No Date column or recognised metric columns. Start from the template.' }
  }

  let imported = 0
  const errorDetails: string[] = []
  for (let r = 1; r < table.length; r++) {
    const row = table[r]
    const date = (row[dateIdx] ?? '').trim().slice(0, 10)
    if (!date) { errorDetails.push(`Row ${r + 1}: missing date`); continue }
    const nutrients = colKey
      .map((key, i) => (key && row[i] != null && String(row[i]).trim() !== '' && !isNaN(Number(row[i]))
        ? { type: key, value: Number(row[i]), unit: WATER_FIELDS.find((f) => f.key === key)?.unit ?? '', reading_date: `${date} 12:00:00`, source: 'import' }
        : null))
      .filter(Boolean)
    if (nutrients.length === 0) { errorDetails.push(`Row ${r + 1}: no metric values`); continue }
    try {
      await api(`/data/nutrients/${systemId}`, { method: 'POST', body: { nutrients } })
      imported++
    } catch (e) {
      errorDetails.push(`Row ${r + 1}: ${e instanceof Error ? e.message : 'failed'}`)
    }
  }
  const errors = errorDetails.length
  return {
    success: imported > 0,
    imported,
    errors,
    message: imported > 0
      ? `Imported ${imported} reading${imported === 1 ? '' : 's'}${errors ? `, ${errors} skipped` : ''}.`
      : 'No readings imported. Check the file matches the template.',
    errorDetails: errors ? errorDetails.slice(0, 10) : undefined,
  }
}

export async function importFile(type: ImportType, systemId: string, file: File): Promise<ImportResult> {
  if (type === 'water_quality') return importWaterQualityCsv(systemId, file)
  // fish_health → server-side importer (writes the fish_health table)
  const form = new FormData()
  form.append('dataFile', file)
  form.append('systemId', systemId)
  const res = await authFetch(`/import/${type}`, { method: 'POST', body: form })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && (data.error || data.message)) || `Import failed (${res.status}).`)
  return {
    success: !!data.success,
    imported: data.imported ?? 0,
    errors: data.errors ?? 0,
    message: data.message ?? 'Import complete.',
    errorDetails: data.errorDetails,
  }
}
