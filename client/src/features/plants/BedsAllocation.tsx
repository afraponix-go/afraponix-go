import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { useSystems } from '../systems/SystemContext'
import { fetchGrowBedConfigs, deleteBed, type GrowBedConfig } from '../growbeds/api'
import { fetchBatches, type Batch, type BatchStatus } from './batches'
import { prettyCrop } from './api'
import { BedConfigModal } from './BedConfigModal'
import { NewPlantingModal } from './NewPlantingModal'
import { HarvestModal } from './HarvestModal'
import { normalizeBedType, bedFill } from './bedMath'
import '../dashboard/dashboard.css'
import '../fish/fish.css'
import '../growbeds/growbeds.css'
import './plants.css'

const STATUS: Record<BatchStatus, string> = { growing: 'growing', approaching: 'approaching', ready: 'ready', harvested: 'harvested' }

function fullnessClass(pct: number) {
  return pct >= 80 ? 'high' : pct >= 50 ? 'medium' : 'low'
}

export function BedsAllocation() {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const [bedModal, setBedModal] = useState<{ bed?: GrowBedConfig } | null>(null)
  const [confirmBedDel, setConfirmBedDel] = useState<GrowBedConfig | null>(null)
  const [plantBed, setPlantBed] = useState<GrowBedConfig | null>(null)
  const [harvesting, setHarvesting] = useState<Batch | null>(null)

  const { data: beds = [], isLoading, isError } = useQuery({ queryKey: ['grow-bed-configs', activeId], queryFn: () => fetchGrowBedConfigs(activeId as string), enabled: !!activeId })
  const { data: batches = [] } = useQuery({ queryKey: ['plant-batches', activeId], queryFn: () => fetchBatches(activeId as string), enabled: !!activeId })

  const delBed = useMutation({
    mutationFn: (b: GrowBedConfig) => deleteBed(b.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grow-bed-configs'] })
      qc.invalidateQueries({ queryKey: ['grow-beds'] })
      setConfirmBedDel(null)
    },
  })

  if (!activeId) return <div className="empty">Select a system to manage beds.</div>
  if (isLoading) return <div className="empty">Loading grow beds…</div>
  if (isError) return <div className="empty">Could not load grow beds.</div>

  const bedNumbers = beds.map((b) => b.bed_number ?? 0)

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Grow beds</h2>
        <button className="btn feed-btn" onClick={() => setBedModal({})}>+ Add grow bed</button>
      </div>

      {beds.length === 0 && <div className="empty">No grow beds configured yet. Add one to get started.</div>}

      <div className="tank-grid">
        {beds
          .slice()
          .sort((a, b) => (a.bed_number ?? 0) - (b.bed_number ?? 0))
          .map((bed) => {
            const bedBatches = batches
              .filter((b) => b.grow_bed_id === bed.id && b.status !== 'harvested' && b.remaining > 0)
              .sort((a, b) => (b.age_days ?? 0) - (a.age_days ?? 0))
            const plants = bedBatches.reduce((n, b) => n + b.remaining, 0)
            const fill = bedFill(bed, plants)
            return (
              <div className="tank-card bed-fill-card" key={bed.id}>
                <div className="tank-head">
                  <span className="tank-name">{bed.bed_name ?? `Bed ${bed.bed_number ?? bed.id}`}</span>
                  {bed.bed_type && <span className="tank-type">{normalizeBedType(bed.bed_type)}</span>}
                </div>

                <div className="bed-stats">
                  <div className="bed-stat"><b>{plants}</b> plants</div>
                  <div className="bed-stat">{fill.usage}</div>
                  <div className="bed-stat">{Math.max(0, fill.spaceLeft).toLocaleString()} space left</div>
                  <div className={`bed-fullness ${fullnessClass(fill.pct)}`}>{fill.pct}% full</div>
                </div>

                {bedBatches.length > 0 ? (
                  <div className="crop-list bed-batch-list">
                    {bedBatches.map((b) => {
                      const harvestIn = b.days_to_harvest != null && b.age_days != null ? Math.max(0, b.days_to_harvest - b.age_days) : null
                      return (
                        <div className="crop-row" key={b.batch_id}>
                          <div className="crop-main">
                            <span className="crop-name">
                              {prettyCrop(b.crop_type)}
                              {b.status === 'ready' && <span className="batch-badge ready" style={{ marginLeft: 8 }}>Ready</span>}
                            </span>
                            <span className="crop-date">
                              {b.age_days ?? '—'}d old · {harvestIn != null ? `harvest in ${harvestIn}d` : 'harvest time unknown'}
                            </span>
                          </div>
                          <div className="bed-batch-right">
                            <div className="crop-nums"><b>{b.remaining}</b><span>plants</span></div>
                            <button className="row-btn" onClick={() => setHarvesting(b)}>Harvest</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bed-empty">No active plantings in this bed.</div>
                )}

                <div className="tank-actions">
                  <button className="tank-action-btn" onClick={() => setPlantBed(bed)}>+ Plant</button>
                  <button className="tank-action-btn" onClick={() => setBedModal({ bed })}>Edit bed</button>
                  <button className="tank-action-btn danger" onClick={() => setConfirmBedDel(bed)}>Delete</button>
                </div>
              </div>
            )
          })}
      </div>

      {bedModal && <BedConfigModal bed={bedModal.bed} existingBedNumbers={bedNumbers} onClose={() => setBedModal(null)} />}
      {plantBed && <NewPlantingModal initialBedId={plantBed.id} onClose={() => setPlantBed(null)} />}
      {harvesting && <HarvestModal batch={harvesting} onClose={() => setHarvesting(null)} />}

      {confirmBedDel && (
        <Modal title="Delete grow bed" onClose={() => setConfirmBedDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>
            Delete <b>{confirmBedDel.bed_name ?? `Bed ${confirmBedDel.bed_number}`}</b>?
            {batches.some((a) => a.grow_bed_id === confirmBedDel.id && a.remaining > 0)
              ? ' This bed still has active plantings — their history is kept but the bed is removed.'
              : ' This can\'t be undone.'}
          </p>
          <div className="mform-actions">
            <button type="button" className="ghost" onClick={() => setConfirmBedDel(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={delBed.isPending} onClick={() => delBed.mutate(confirmBedDel)}>{delBed.isPending ? 'Deleting…' : 'Delete bed'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
