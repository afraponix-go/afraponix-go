import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { useSystems } from '../systems/SystemContext'
import { fetchGrowBedConfigs, deleteBed, type GrowBedConfig } from '../growbeds/api'
import { fetchAllocations, deleteAllocation, prettyCrop, type Allocation } from './api'
import { AllocationModal } from './AllocationModal'
import { BedConfigModal } from './BedConfigModal'
import { normalizeBedType } from './bedMath'
import '../dashboard/dashboard.css'
import '../fish/fish.css'
import '../growbeds/growbeds.css'
import './plants.css'

const sumPct = (items: Allocation[]) => items.reduce((n, a) => n + (a.percentage_allocated ?? 0), 0)

export function BedsAllocation() {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ bed: GrowBedConfig; allocation?: Allocation } | null>(null)
  const [confirmDel, setConfirmDel] = useState<Allocation | null>(null)
  const [bedModal, setBedModal] = useState<{ bed?: GrowBedConfig } | null>(null)
  const [confirmBedDel, setConfirmBedDel] = useState<GrowBedConfig | null>(null)

  const { data: beds = [], isLoading, isError } = useQuery({ queryKey: ['grow-bed-configs', activeId], queryFn: () => fetchGrowBedConfigs(activeId as string), enabled: !!activeId })
  const { data: allocations = [] } = useQuery({ queryKey: ['allocations', activeId], queryFn: () => fetchAllocations(activeId as string), enabled: !!activeId })

  const del = useMutation({
    mutationFn: (a: Allocation) => deleteAllocation(a.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allocations'] })
      setConfirmDel(null)
    },
  })

  const delBed = useMutation({
    mutationFn: (b: GrowBedConfig) => deleteBed(b.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grow-bed-configs'] })
      qc.invalidateQueries({ queryKey: ['grow-beds'] })
      qc.invalidateQueries({ queryKey: ['allocations'] })
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
        <h2 className="section-title" style={{ margin: 0 }}>Beds &amp; allocation</h2>
        <button className="btn feed-btn" onClick={() => setBedModal({})}>+ Add grow bed</button>
      </div>

      {beds.length === 0 && <div className="empty">No grow beds configured yet. Add one to get started.</div>}

      <div className="tank-grid">
        {beds
          .slice()
          .sort((a, b) => (a.bed_number ?? 0) - (b.bed_number ?? 0))
          .map((bed) => {
            const allocs = allocations.filter((a) => a.grow_bed_id === bed.id && (a.status ?? 'active') === 'active')
            const used = Math.min(100, sumPct(allocs))
            const available = Math.max(0, Math.round((100 - sumPct(allocs)) * 10) / 10)
            const full = available < 0.5
            return (
              <div className="tank-card" key={bed.id}>
                <div className="tank-head">
                  <span className="tank-name">{bed.bed_name ?? `Bed ${bed.bed_number ?? bed.id}`}</span>
                  {bed.bed_type && <span className="tank-type">{normalizeBedType(bed.bed_type)}</span>}
                </div>
                <div className="bed-area">{(bed.equivalent_m2 ?? 0).toFixed(1)} m² grow area</div>

                <div className="util" style={{ margin: '10px 0 4px' }}>
                  <div className="util-bar">
                    <div className={`util-fill ${full ? 'full' : ''}`} style={{ width: `${used}%` }} />
                  </div>
                  <div className="util-legend">
                    <span>{used.toFixed(0)}% allocated</span>
                    <span>{available.toFixed(0)}% free</span>
                  </div>
                </div>

                {allocs.length === 0 ? (
                  <div className="bed-empty">No crops allocated yet.</div>
                ) : (
                  <div className="crop-list" style={{ marginTop: 10 }}>
                    {allocs
                      .slice()
                      .sort((a, b) => (b.percentage_allocated ?? 0) - (a.percentage_allocated ?? 0))
                      .map((a) => (
                        <div className="crop-row" key={a.id}>
                          <div className="crop-main">
                            <span className="crop-name">{prettyCrop(a.crop_type)}</span>
                            <span className="crop-date">{(a.plants_planted ?? 0).toLocaleString()} plants · {a.plant_spacing ?? 30} cm</span>
                          </div>
                          <div className="alloc-actions">
                            <span className="alloc-pct">{(a.percentage_allocated ?? 0).toFixed(0)}%</span>
                            <button className="link-btn" onClick={() => setModal({ bed, allocation: a })}>Edit</button>
                            <button className="link-btn danger" onClick={() => setConfirmDel(a)}>Delete</button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <div className="tank-actions">
                  <button className="tank-action-btn" onClick={() => setModal({ bed })} disabled={full}>+ Add crop</button>
                  <button className="tank-action-btn" onClick={() => setBedModal({ bed })}>Edit bed</button>
                  <button className="tank-action-btn danger" onClick={() => setConfirmBedDel(bed)}>Delete</button>
                </div>
              </div>
            )
          })}
      </div>

      {modal && (
        <AllocationModal
          bed={modal.bed}
          allocation={modal.allocation}
          usedByOthers={sumPct(allocations.filter((a) => a.grow_bed_id === modal.bed.id && a.id !== modal.allocation?.id && (a.status ?? 'active') === 'active'))}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDel && (
        <Modal title="Remove allocation" onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>
            Remove the {prettyCrop(confirmDel.crop_type)} allocation from this bed? The planting history is kept.
          </p>
          <div className="mform-actions">
            <button type="button" className="ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={del.isPending} onClick={() => del.mutate(confirmDel)}>{del.isPending ? 'Removing…' : 'Remove'}</button>
          </div>
        </Modal>
      )}

      {bedModal && <BedConfigModal bed={bedModal.bed} existingBedNumbers={bedNumbers} onClose={() => setBedModal(null)} />}

      {confirmBedDel && (
        <Modal title="Delete grow bed" onClose={() => setConfirmBedDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>
            Delete <b>{confirmBedDel.bed_name ?? `Bed ${confirmBedDel.bed_number}`}</b>?
            {allocations.some((a) => a.grow_bed_id === confirmBedDel.id)
              ? ' This bed still has crop allocations — they will be removed too.'
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
