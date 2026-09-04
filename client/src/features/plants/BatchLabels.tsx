import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { useSystems } from '../systems/SystemContext'
import { fetchBatches, type Batch } from './batches'
import { prettyCrop } from './api'
import { batchScanUrl } from './batchQr'
import './plants.css'
import './labels.css'

// Print a sheet of QR labels — one per batch — that stay physically with the
// batches. Each QR deep-links to the batch's action sheet when scanned.
export function BatchLabels() {
  const { activeId, activeSystem } = useSystems()
  const [showAll, setShowAll] = useState(false)
  // Batches excluded from this print run (screen-only toggles).
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  const { data: batches = [], isLoading, isError } = useQuery({
    queryKey: ['plant-batches', activeId],
    queryFn: () => fetchBatches(activeId as string),
    enabled: !!activeId,
  })

  const shown = useMemo(
    () => (showAll ? batches : batches.filter((b) => b.status !== 'harvested' && b.remaining > 0)),
    [batches, showAll],
  )
  const includedCount = shown.filter((b) => !excluded.has(b.batch_id)).length

  if (!activeId) return <div className="empty">Select a system to print its batch labels.</div>
  if (isLoading) return <div className="empty">Loading batches…</div>
  if (isError) return <div className="empty">Could not load batches.</div>

  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const selectAll = () => setExcluded(new Set())
  const clearAll = () => setExcluded(new Set(shown.map((b) => b.batch_id)))

  const bedText = (b: Batch) => b.bed_name ?? (b.bed_number != null ? `Bed ${b.bed_number}` : '')

  return (
    <div>
      <div className="labels-head">
        <h2 className="section-title" style={{ margin: 0 }}>Batch labels</h2>
        <div className="labels-tools">
          <div className="seg">
            <button className={`seg-btn ${!showAll ? 'active' : ''}`} onClick={() => setShowAll(false)}>Active</button>
            <button className={`seg-btn ${showAll ? 'active' : ''}`} onClick={() => setShowAll(true)}>All</button>
          </div>
          <button className="ghost" onClick={selectAll}>Select all</button>
          <button className="ghost" onClick={clearAll}>Clear</button>
          <span className="labels-count">{includedCount} label{includedCount === 1 ? '' : 's'}</span>
          <button className="btn feed-btn" onClick={() => window.print()} disabled={includedCount === 0}>Print</button>
        </div>
      </div>
      <p className="labels-sub">
        {activeSystem?.system_name} · scan a label to open the batch. Prints on A4 sticker paper (3-across, 24-up). Untick a label to leave it off this run.
      </p>

      {shown.length === 0 ? (
        <div className="empty">{showAll ? 'No batches to label yet.' : 'No active batches. Switch to “All” to reprint older ones.'}</div>
      ) : (
        <div className="label-sheet-wrap">
        <div className="label-sheet">
          {shown.map((b) => {
            const out = excluded.has(b.batch_id)
            return (
              <div className={`qr-label${out ? ' is-out' : ''}`} key={b.batch_id}>
                <input
                  type="checkbox"
                  className="label-pick"
                  checked={!out}
                  onChange={() => toggle(b.batch_id)}
                  aria-label={`Include ${b.batch_id}`}
                />
                <div className="label-qr">
                  <QRCodeSVG value={batchScanUrl(activeId, b.batch_id)} size={96} level="Q" marginSize={0} />
                </div>
                <div className="label-info">
                  <span className="label-batch">{b.batch_id}</span>
                  <span className="label-crop">{prettyCrop(b.crop_type)}{b.seed_variety ? ` · ${b.seed_variety}` : ''}</span>
                  {bedText(b) && <span className="label-sub">{bedText(b)}</span>}
                </div>
              </div>
            )
          })}
        </div>
        </div>
      )}
    </div>
  )
}
