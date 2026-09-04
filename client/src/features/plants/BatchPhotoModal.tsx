import { useRef, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { fetchBatchPhotos, uploadBatchPhoto, deleteBatchPhoto, type BatchPhoto } from './photos'
import { downscaleImage } from './imageDownscale'
import './photos.css'

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

// View + capture crop photos for one batch. On mobile the capture button opens
// the rear camera directly; on desktop it's a file picker.
export function BatchPhotoModal({ systemId, batchId, title, cropType, onClose }: {
  systemId: string
  batchId: string
  title: string
  cropType?: string | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['batch-photos', systemId, batchId],
    queryFn: () => fetchBatchPhotos(systemId, batchId),
  })

  const upload = useMutation({
    mutationFn: (file: File) => uploadBatchPhoto(systemId, batchId, file, { crop_type: cropType }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batch-photos', systemId, batchId] }),
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not upload the photo.'),
  })
  const del = useMutation({
    mutationFn: (p: BatchPhoto) => deleteBatchPhoto(p.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batch-photos', systemId, batchId] }),
  })

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    setError(null)
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    // Shrink on-device before uploading so field uploads stay small.
    setPreparing(true)
    const prepared = await downscaleImage(file)
    setPreparing(false)
    upload.mutate(prepared)
  }

  return (
    <Modal title={`Photos · ${title}`} onClose={onClose}>
      {error && <div className="wq-error">{error}</div>}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <button type="button" className="btn photo-add" disabled={preparing || upload.isPending} onClick={() => inputRef.current?.click()}>
        {preparing ? 'Preparing…' : upload.isPending ? 'Uploading…' : '📷 Take / add photo'}
      </button>

      {isLoading ? (
        <div className="empty">Loading…</div>
      ) : photos.length === 0 ? (
        <div className="empty">No photos yet. Add one to start this batch’s visual record.</div>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <figure className="photo-cell" key={p.id}>
              <a href={p.url} target="_blank" rel="noopener noreferrer">
                <img src={p.url} alt={`${title} · ${fmt(p.taken_at)}`} loading="lazy" />
              </a>
              <figcaption>
                <span>{fmt(p.taken_at)}</span>
                <button type="button" className="link-btn danger" onClick={() => del.mutate(p)} disabled={del.isPending}>Delete</button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </Modal>
  )
}
