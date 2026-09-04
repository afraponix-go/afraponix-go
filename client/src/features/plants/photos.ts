import { api } from '../../lib/apiClient'
import { getToken } from '../../lib/token'

export type Deficiency = { nutrient: string; confidence?: string; visible_signs?: string; severity?: string }
export type PhotoAnalysis = {
  engine?: string
  model?: string
  deficiencies: Deficiency[]
  ruling_out?: string[]
  overall?: string
  suggested_checks?: string[]
}
export type LabelStatus = 'confirmed' | 'corrected' | 'not_deficiency'

export type BatchPhoto = {
  id: number
  batch_id: string
  url: string
  crop_type: string | null
  taken_at: string
  notes: string | null
  analysis: PhotoAnalysis | null
  analysis_engine: string | null
  analyzed_at: string | null
  label_status: LabelStatus | null
  label_nutrient: string | null
}

// batch_id goes in the query/body (not the path) — it contains "/", which Apache
// blocks in a path segment.
export async function fetchBatchPhotos(systemId: string, batchId: string): Promise<BatchPhoto[]> {
  const d = await api<{ photos: BatchPhoto[] }>(`/batch-photos/${systemId}?batch=${encodeURIComponent(batchId)}`)
  return d.photos
}

export async function uploadBatchPhoto(
  systemId: string,
  batchId: string,
  file: File,
  opts?: { crop_type?: string | null; notes?: string },
): Promise<BatchPhoto> {
  const fd = new FormData()
  fd.append('photo', file)
  fd.append('batch_id', batchId)
  if (opts?.crop_type) fd.append('crop_type', opts.crop_type)
  if (opts?.notes) fd.append('notes', opts.notes)
  const token = getToken()
  // Raw fetch (not the JSON api wrapper) so the browser sets the multipart boundary.
  const res = await fetch(`/api/batch-photos/${systemId}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok) throw new Error((payload && payload.error) || `Upload failed (${res.status})`)
  return payload.photo
}

export function deleteBatchPhoto(id: number) {
  return api(`/batch-photos/${id}`, { method: 'DELETE' })
}

// Run deficiency analysis on a stored photo (advisory; fuses the crop's targets
// + the system's latest readings server-side).
export async function analyzeBatchPhoto(id: number): Promise<BatchPhoto> {
  const d = await api<{ photo: BatchPhoto }>(`/batch-photos/${id}/analyze`, { method: 'POST' })
  return d.photo
}

// Operator confirm/correct — the label a future in-house engine learns from.
export async function labelBatchPhoto(id: number, body: { status: LabelStatus; nutrient?: string }): Promise<BatchPhoto> {
  const d = await api<{ photo: BatchPhoto }>(`/batch-photos/${id}/label`, { method: 'POST', body })
  return d.photo
}
