import { useRef, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import {
  fetchBatchPhotos, uploadBatchPhoto, deleteBatchPhoto, analyzeBatchPhoto, labelBatchPhoto,
  type BatchPhoto, type LabelStatus,
} from './photos'
import { downscaleImage } from './imageDownscale'
import { CameraCaptureModal } from './CameraCaptureModal'
import './photos.css'

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const NUTRIENTS = ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)', 'Calcium (Ca)', 'Magnesium (Mg)', 'Iron (Fe)', 'pH lock-out', 'Other']
const shortN = (s: string) => (s.match(/\(([^)]+)\)/)?.[1] ?? s.split(' ')[0])
const confClass = (c?: string) => (c === 'high' ? 'high' : c === 'medium' ? 'mid' : 'low')

// View + capture crop photos for one batch, and run advisory deficiency analysis.
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
  const [camera, setCamera] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['batch-photos', systemId, batchId],
    queryFn: () => fetchBatchPhotos(systemId, batchId),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['batch-photos', systemId, batchId] })

  const upload = useMutation({
    mutationFn: (file: File) => uploadBatchPhoto(systemId, batchId, file, { crop_type: cropType }),
    onSuccess: invalidate,
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not upload the photo.'),
  })

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    setError(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPreparing(true)
    const prepared = await downscaleImage(file)
    setPreparing(false)
    upload.mutate(prepared)
  }

  const expanded = photos.find((p) => p.id === expandedId) ?? null

  return (
    <Modal title={`Photos · ${title}`} onClose={onClose}>
      {error && <div className="wq-error">{error}</div>}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
      <button type="button" className="btn photo-add" disabled={preparing || upload.isPending} onClick={() => setCamera(true)}>
        {preparing ? 'Preparing…' : upload.isPending ? 'Uploading…' : '📷 Take photo'}
      </button>
      <button type="button" className="link-btn photo-fallback" onClick={() => inputRef.current?.click()}>Upload a file instead</button>

      {camera && (
        <CameraCaptureModal
          onCapture={(file) => { setCamera(false); upload.mutate(file) }}
          onFallback={() => { setCamera(false); inputRef.current?.click() }}
          onClose={() => setCamera(false)}
        />
      )}

      {isLoading ? (
        <div className="empty">Loading…</div>
      ) : photos.length === 0 ? (
        <div className="empty">No photos yet. Add one to start this batch’s visual record.</div>
      ) : (
        <>
          <div className="photo-grid">
            {photos.map((p) => {
              const top = p.analysis?.deficiencies?.[0]
              return (
                <figure
                  className={`photo-cell${expandedId === p.id ? ' sel' : ''}`}
                  key={p.id}
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  <img src={p.url} alt={`${title} · ${fmt(p.taken_at)}`} loading="lazy" />
                  <figcaption>
                    <span>{fmt(p.taken_at)}</span>
                    {p.analyzed_at && (
                      <span className={`an-chip ${top ? 'warn' : 'ok'}`}>{top ? shortN(top.nutrient) : 'OK'}</span>
                    )}
                  </figcaption>
                </figure>
              )
            })}
          </div>
          {expanded && <AnalysisPanel key={expanded.id} photo={expanded} onDone={invalidate} onDeleted={() => { setExpandedId(null); invalidate() }} />}
        </>
      )}
    </Modal>
  )
}

function AnalysisPanel({ photo, onDone, onDeleted }: { photo: BatchPhoto; onDone: () => void; onDeleted: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [correcting, setCorrecting] = useState(false)
  const [correctN, setCorrectN] = useState(NUTRIENTS[0])

  const analyze = useMutation({
    mutationFn: () => analyzeBatchPhoto(photo.id),
    onSuccess: onDone,
    onError: (e) => setError(e instanceof Error ? e.message : 'Analysis failed.'),
  })
  const label = useMutation({ mutationFn: (b: { status: LabelStatus; nutrient?: string }) => labelBatchPhoto(photo.id, b), onSuccess: onDone })
  const del = useMutation({ mutationFn: () => deleteBatchPhoto(photo.id), onSuccess: onDeleted })

  const a = photo.analysis
  return (
    <div className="an-panel">
      <div className="an-head">
        <a href={photo.url} target="_blank" rel="noopener noreferrer"><img className="an-thumb" src={photo.url} alt="" /></a>
        <div className="an-head-main">
          <div className="an-date">{fmt(photo.taken_at)}</div>
          <div className="an-head-actions">
            <button className="btn an-sm" disabled={analyze.isPending} onClick={() => analyze.mutate()}>
              {analyze.isPending ? 'Analysing…' : photo.analyzed_at ? 'Re-analyse' : 'Analyse for deficiencies'}
            </button>
            <button className="link-btn danger" disabled={del.isPending} onClick={() => del.mutate()}>Delete</button>
          </div>
        </div>
      </div>

      {error && <div className="wq-error">{error}</div>}

      {a && (
        <div className="an-result">
          {a.overall && <p className="an-overall">{a.overall}</p>}
          {a.deficiencies.length > 0 ? (
            a.deficiencies.map((d, i) => (
              <div className="an-def" key={i}>
                <div className="an-def-top">
                  <b>{d.nutrient}</b>
                  {d.confidence && <span className={`an-badge ${confClass(d.confidence)}`}>{d.confidence}</span>}
                  {d.severity && <span className="an-sev">{d.severity}</span>}
                </div>
                {d.visible_signs && <div className="an-signs">{d.visible_signs}</div>}
              </div>
            ))
          ) : (
            <div className="an-ok">No deficiency detected — plant looks healthy.</div>
          )}

          {a.ruling_out && a.ruling_out.length > 0 && (
            <div className="an-ruleout"><b>Ruling out:</b> {a.ruling_out.join('; ')}</div>
          )}
          {a.suggested_checks && a.suggested_checks.length > 0 && (
            <ul className="an-checks">{a.suggested_checks.map((c, i) => <li key={i}>{c}</li>)}</ul>
          )}
          <div className="an-engine">via {photo.analysis_engine ?? 'engine'} · advisory, not a diagnosis</div>

          <div className="an-feedback">
            {photo.label_status ? (
              <span className="an-labeled">
                ✓ Feedback saved: {photo.label_status.replace('_', ' ')}{photo.label_nutrient ? ` · ${photo.label_nutrient}` : ''}
              </span>
            ) : correcting ? (
              <span className="an-correct">
                Actual cause:
                <select value={correctN} onChange={(e) => setCorrectN(e.target.value)}>
                  {NUTRIENTS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <button className="link-btn" onClick={() => label.mutate({ status: 'corrected', nutrient: correctN })}>Save</button>
                <button className="link-btn" onClick={() => setCorrecting(false)}>Cancel</button>
              </span>
            ) : (
              <span className="an-ask">
                Was this right?
                <button className="link-btn" onClick={() => label.mutate({ status: 'confirmed' })}>Confirm</button>
                <button className="link-btn" onClick={() => setCorrecting(true)}>Correct…</button>
                <button className="link-btn" onClick={() => label.mutate({ status: 'not_deficiency' })}>Not a deficiency</button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
