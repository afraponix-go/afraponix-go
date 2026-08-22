import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { Modal } from '../../components/Modal'
import { fetchLog, deleteLog, type LogEntry } from './api'
import { RecordModal } from './RecordModal'
import './spray.css'

export function SprayLog() {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const [record, setRecord] = useState(false)
  const [confirmDel, setConfirmDel] = useState<LogEntry | null>(null)
  const { data: log = [], isLoading } = useQuery({ queryKey: ['spray-log', activeId], queryFn: () => fetchLog(activeId as string), enabled: !!activeId })
  const del = useMutation({
    mutationFn: (l: LogEntry) => deleteLog(l.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['spray-log'] }); qc.invalidateQueries({ queryKey: ['spray-due'] }); qc.invalidateQueries({ queryKey: ['spray-calendar'] }); setConfirmDel(null) },
  })

  if (!activeId) return <div className="empty">Select a system to see the spray log.</div>

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Application log</h2>
        <button className="btn feed-btn" onClick={() => setRecord(true)}>+ Record application</button>
      </div>
      <p className="spray-lead">A record of every spray applied — date, product, conditions and how well it worked.</p>

      {isLoading ? <div className="empty">Loading…</div> : log.length === 0 ? (
        <div className="empty">No applications recorded yet.</div>
      ) : (
        <div className="log-table-wrap">
          <table className="log-table">
            <thead><tr><th>Date</th><th>Product</th><th>Programme</th><th>Amount</th><th>Conditions</th><th className="r">Effect.</th><th></th></tr></thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id}>
                  <td>{l.application_date}</td>
                  <td><b>{l.product_name ?? '—'}</b>{l.notes && <div className="log-note">{l.notes}</div>}</td>
                  <td>{l.plan_name ?? '—'}</td>
                  <td>{l.amount ?? l.rate ?? '—'}</td>
                  <td>{l.weather ?? '—'}</td>
                  <td className="r">{l.effectiveness != null ? `${l.effectiveness}/5` : '—'}</td>
                  <td className="r"><button className="link-btn danger" onClick={() => setConfirmDel(l)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {record && activeId && <RecordModal systemId={activeId} onClose={() => setRecord(false)} />}
      {confirmDel && (
        <Modal title="Delete log entry" onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>Delete the {confirmDel.application_date} application of <b>{confirmDel.product_name ?? 'this product'}</b>?</p>
          <div className="mform-actions">
            <button type="button" className="ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={del.isPending} onClick={() => del.mutate(confirmDel)}>{del.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
