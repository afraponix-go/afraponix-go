import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { Modal } from '../../components/Modal'
import { fetchProgrammes, fetchDue, fetchHarvestHolds, deleteProgramme, setProgrammeStatus, WEEKDAY_LABEL, type Programme } from './api'
import { CATEGORY_LABEL, FishBadge } from './shared'
import { ProgrammeModal } from './ProgrammeModal'
import { RecordModal, type RecordPrefill } from './RecordModal'
import './spray.css'

export function Programmes() {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const [edit, setEdit] = useState<{ programme?: Programme } | null>(null)
  const [record, setRecord] = useState<RecordPrefill | null>(null)
  const [confirmDel, setConfirmDel] = useState<Programme | null>(null)
  const [newMenu, setNewMenu] = useState(false)

  const { data: programmes = [], isLoading } = useQuery({ queryKey: ['spray-programmes', activeId], queryFn: () => fetchProgrammes(activeId as string), enabled: !!activeId })
  const { data: dueData } = useQuery({ queryKey: ['spray-due', activeId], queryFn: () => fetchDue(activeId as string), enabled: !!activeId })
  const { data: holds = [] } = useQuery({ queryKey: ['spray-holds', activeId], queryFn: () => fetchHarvestHolds(activeId as string), enabled: !!activeId })
  const del = useMutation({
    mutationFn: (p: Programme) => deleteProgramme(p.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['spray-programmes'] }); qc.invalidateQueries({ queryKey: ['spray-due'] }); setConfirmDel(null) },
  })
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'paused' }) => setProgrammeStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spray-programmes'] })
      qc.invalidateQueries({ queryKey: ['spray-due'] })
      qc.invalidateQueries({ queryKey: ['spray-calendar'] })
    },
  })

  if (!activeId) return <div className="empty">Select a system to manage programmes.</div>

  const due = dueData?.due ?? []
  const pending = due.filter((d) => !d.done)

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Programmes</h2>
        <div className="np-new">
          <button className="btn feed-btn" aria-haspopup="menu" aria-expanded={newMenu} onClick={() => setNewMenu((v) => !v)}>+ New programme ▾</button>
          {newMenu && (
            <>
              <div className="np-backdrop" onClick={() => setNewMenu(false)} />
              <div className="np-menu" role="menu">
                <button role="menuitem" className="np-item" onClick={() => { setNewMenu(false); setEdit({}) }}>
                  <span className="np-dot spray" /> Spray programme
                </button>
                <button role="menuitem" className="np-item" disabled>
                  <span className="np-dot dosing" /> Dosing programme <span className="np-soon">Soon</span>
                </button>
                <button role="menuitem" className="np-item" disabled>
                  <span className="np-dot operating" /> Operating programme <span className="np-soon">Soon</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="spray-lead">Recurring work for this system. Today that's spray programmes — dosing and operating programmes are coming. Spray products are flagged for fish safety; never let a fish‑toxic spray reach the system water.</p>

      {holds.length > 0 && (
        <div className="spray-hold">
          <div className="spray-hold-head">⚠ Harvest hold — do not harvest these batches yet (pre‑harvest interval)</div>
          <div className="spray-hold-list">
            {holds.map((h, i) => (
              <div key={i} className="spray-hold-item">
                <span className="spray-hold-crop">{h.crop_type ?? 'Batch'}{h.bed_name ? ` · ${h.bed_name}` : ''}</span>
                <span className="spray-hold-meta">{h.product_name} · harvest from <b>{h.harvest_safe_date}</b> ({h.days_remaining} day{h.days_remaining === 1 ? '' : 's'} left)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {due.length > 0 && (
        <div className="spray-due">
          <div className="spray-due-head">Due today {pending.length === 0 && <span className="spray-alldone">✓ all recorded</span>}</div>
          <div className="spray-due-list">
            {due.map((d) => (
              <div key={`${d.plan_id}-${d.product_id}`} className={`spray-due-item ${d.done ? 'done' : ''}`}>
                <div className="spray-due-main">
                  <span className="spray-due-name">{d.product_name}</span>
                  <span className="spray-due-cat">{CATEGORY_LABEL[d.category] ?? d.category}</span>
                  <FishBadge safety={d.fish_safety} note={d.fish_note} />
                  {d.rate && <span className="spray-due-rate">{d.rate}</span>}
                </div>
                {d.done ? <span className="spray-done-tag">Recorded</span> : (
                  <button className="row-btn" onClick={() => setRecord({ plan_id: d.plan_id, product_id: d.product_id, product_name: d.product_name, rate: d.rate })}>Record</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="empty">Loading…</div>
      ) : programmes.length === 0 ? (
        <div className="empty">No programmes yet. Create one to schedule your sprays.</div>
      ) : (
        <div className="spray-cards">
          {programmes.map((p) => (
            <div key={p.id} className={`spray-card ${p.status !== 'active' ? 'inactive' : ''}`}>
              <div className="spray-card-head">
                <span className="spray-card-name">{p.name}{p.status !== 'active' && <span className="spray-inactive-tag">paused</span>}</span>
                <span className="crop-card-actions">
                  <button className="link-btn" disabled={statusMut.isPending} onClick={() => statusMut.mutate({ id: p.id, status: p.status === 'active' ? 'paused' : 'active' })}>{p.status === 'active' ? 'Pause' : 'Resume'}</button>
                  <button className="link-btn" onClick={() => setEdit({ programme: p })}>Edit</button>
                  <button className="link-btn danger" onClick={() => setConfirmDel(p)}>Delete</button>
                </span>
              </div>
              {p.products.length === 0 ? (
                <div className="spray-card-empty">No products — edit to add some.</div>
              ) : (
                <div className="spray-card-products">
                  {p.products.map((pr) => (
                    <div key={pr.id} className="spray-cp">
                      <span className="spray-cp-name">{pr.product_name}</span>
                      <FishBadge safety={pr.fish_safety} note={pr.fish_note} />
                      <span className="spray-cp-days">{pr.days.length ? pr.days.map((d) => WEEKDAY_LABEL[d]).join(' · ') : 'no days set'}</span>
                    </div>
                  ))}
                </div>
              )}
              {p.notes && <div className="spray-card-notes">{p.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {edit && activeId && <ProgrammeModal systemId={activeId} programme={edit.programme} onClose={() => setEdit(null)} />}
      {record && activeId && <RecordModal systemId={activeId} prefill={record} onClose={() => setRecord(null)} />}
      {confirmDel && (
        <Modal title="Delete programme" onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>Delete <b>{confirmDel.name}</b>? Its schedule is removed; logged applications are kept.</p>
          <div className="mform-actions">
            <button type="button" className="ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={del.isPending} onClick={() => del.mutate(confirmDel)}>{del.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
