import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { Modal } from '../../components/Modal'
import { fetchProgrammes, fetchDue, deleteProgramme, setProgrammeStatus, WEEKDAY_LABEL, type Programme } from './api'
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

  const { data: programmes = [], isLoading } = useQuery({ queryKey: ['spray-programmes', activeId], queryFn: () => fetchProgrammes(activeId as string), enabled: !!activeId })
  const { data: dueData } = useQuery({ queryKey: ['spray-due', activeId], queryFn: () => fetchDue(activeId as string), enabled: !!activeId })
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

  if (!activeId) return <div className="empty">Select a system to manage spray programmes.</div>

  const due = dueData?.due ?? []
  const pending = due.filter((d) => !d.done)

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Spray programmes</h2>
        <button className="btn feed-btn" onClick={() => setEdit({})}>+ New programme</button>
      </div>
      <p className="spray-lead">Plan your pest, disease and foliar‑feed sprays. Products are flagged for fish safety — never let a fish‑toxic spray reach the system water.</p>

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
