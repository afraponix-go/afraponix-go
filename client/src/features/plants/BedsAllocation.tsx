import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { useSystems } from '../systems/SystemContext'
import { fetchGrowBedConfigs, type GrowBedConfig } from '../growbeds/api'
import { fetchAllocations, deleteAllocation, prettyCrop, type Allocation } from './api'
import { AllocationModal } from './AllocationModal'
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

  const { data: beds = [], isLoading, isError } = useQuery({ queryKey: ['grow-bed-configs', activeId], queryFn: () => fetchGrowBedConfigs(activeId as string), enabled: !!activeId })
  const { data: allocations = [] } = useQuery({ queryKey: ['allocations', activeId], queryFn: () => fetchAllocations(activeId as string), enabled: !!activeId })

  const del = useMutation({
    mutationFn: (a: Allocation) => deleteAllocation(a.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allocations'] })
      setConfirmDel(null)
    },
  })

  if (!activeId) return <div className="empty">Select a system to manage beds.</div>
  if (isLoading) return <div className="empty">Loading grow beds…</div>
  if (isError) return <div className="empty">Could not load grow beds.</div>
  if (beds.length === 0) return <div className="empty">No grow beds configured for this system yet.</div>

  return (
    <div>
      <h2 className="section-title" style={{ marginTop: 0 }}>Beds &amp; allocation</h2>
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
                  {bed.bed_type && <span className="tank-type">{bed.bed_type}</span>}
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
    </div>
  )
}
