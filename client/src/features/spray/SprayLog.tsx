import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { Modal } from '../../components/Modal'
import { fetchLog, deleteLog, rateLogEffectiveness, type LogEntry } from './api'
import { RecordModal } from './RecordModal'
import { fetchDosingLog, deleteDoseLog, nutrientShort, type DosingLogEntry } from '../dosing/api'
import { RetestModal } from '../dosing/RetestModal'
import '../dosing/dosing.css'
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
  const rate = useMutation({
    mutationFn: ({ id, eff }: { id: number; eff: number | null }) => rateLogEffectiveness(id, eff),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spray-log'] }),
  })

  const { data: doseLog = [] } = useQuery({ queryKey: ['dosing-log', activeId], queryFn: () => fetchDosingLog(activeId as string), enabled: !!activeId })
  const [retest, setRetest] = useState<DosingLogEntry | null>(null)
  const [confirmDelDose, setConfirmDelDose] = useState<DosingLogEntry | null>(null)
  const delDose = useMutation({
    mutationFn: (l: DosingLogEntry) => deleteDoseLog(l.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dosing-log'] }); setConfirmDelDose(null) },
  })
  const recoveryClass = (pct: number | null) => (pct == null ? 'pending' : pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low')

  if (!activeId) return <div className="empty">Select a system to see the log.</div>

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Application log</h2>
        <button className="btn feed-btn" onClick={() => setRecord(true)}>+ Record application</button>
      </div>
      <p className="spray-lead">A record of every spray applied — date, product, conditions and how well it worked.</p>

      {isLoading ? <div className="empty">Loading…</div> : log.length === 0 ? (
        <div className="empty">No spray applications recorded yet.</div>
      ) : (
        <div className="log-table-wrap">
          <table className="log-table">
            <thead><tr><th>Date</th><th>Product</th><th>Applied to</th><th>Quantity</th><th>Dilution</th><th>Operator</th><th>Effectiveness</th><th></th></tr></thead>
            <tbody>
              {log.map((l) => {
                const qty = l.quantity != null && l.quantity !== '' ? `${Number(l.quantity)} ${l.quantity_unit ?? ''}`.trim() : '—'
                const dil = l.dilution_value != null && l.dilution_value !== '' ? `${Number(l.dilution_value)} ${l.dilution_unit ?? ''}`.trim() : '—'
                const beds = [...new Set(l.targets.map((t) => t.bed_name).filter(Boolean))]
                const batches = l.targets.filter((t) => t.batch_id)
                const crops = [...new Set(batches.map((t) => t.crop_type).filter(Boolean))]
                const scopeText = l.scope === 'system' ? `Entire system${beds.length ? ` (${beds.length} beds)` : ''}` : beds.length ? beds.join(', ') : l.bed_name ?? '—'
                return (
                  <tr key={l.id}>
                    <td>{l.application_date}{l.phi_days ? <div className="log-note">PHI {l.phi_days}d · harvest ≥ {l.harvest_safe_date}</div> : null}</td>
                    <td><b>{l.product_name ?? '—'}</b>{l.plan_name && <div className="log-note">{l.plan_name}</div>}{l.notes && <div className="log-note">{l.notes}</div>}</td>
                    <td>
                      {scopeText}
                      {batches.length > 0 && <div className="log-note">{batches.length} batch{batches.length === 1 ? '' : 'es'}{crops.length ? ` · ${crops.join(', ')}` : ''}</div>}
                    </td>
                    <td>{qty}</td>
                    <td>{dil}</td>
                    <td>{l.operator ?? '—'}{l.weather && <div className="log-note">{l.weather}</div>}</td>
                    <td>
                      <select className="log-eff-select" value={l.effectiveness ?? ''} disabled={rate.isPending} onChange={(e) => rate.mutate({ id: l.id, eff: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">Rate…</option>
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
                      </select>
                    </td>
                    <td className="r"><button className="link-btn danger" onClick={() => setConfirmDel(l)}>Delete</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {doseLog.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 className="section-title" style={{ margin: '0 0 4px', fontSize: 16 }}>Dosing log</h2>
          <p className="spray-lead">Every dose and its efficacy — the nutrient's before/after reading gives recovery %.</p>
          <div className="log-table-wrap">
            <table className="log-table">
              <thead><tr><th>Date</th><th>Target</th><th>Fertiliser</th><th>Quantity</th><th>Before → After</th><th>Recovery</th><th></th></tr></thead>
              <tbody>
                {doseLog.map((l) => {
                  const nut = nutrientShort(l.target_nutrient ?? 'n')
                  const qty = l.quantity != null ? `${Number(l.quantity)} ${l.quantity_unit ?? ''}`.trim() : '—'
                  return (
                    <tr key={l.id}>
                      <td>{l.event_date}</td>
                      <td><b>{nut}</b>{l.programme_name && <div className="log-note">{l.programme_name}</div>}{l.notes && <div className="log-note">{l.notes}</div>}</td>
                      <td>{l.product_name ?? '—'}</td>
                      <td>{qty}</td>
                      <td>
                        {l.reading_before ?? '—'} → {l.reading_after != null ? Number(l.reading_after) : <button className="link-btn" onClick={() => setRetest(l)}>Record re-test</button>}
                        {l.observed_delta != null && <div className="log-note">Δ {Number(l.observed_delta) > 0 ? '+' : ''}{Math.round(Number(l.observed_delta) * 10) / 10} ppm{l.expected_delta != null ? ` · exp ${Number(l.expected_delta)}` : ''}</div>}
                      </td>
                      <td><span className={`dl-recovery ${recoveryClass(l.recovery_pct)}`}>{l.recovery_pct != null ? `${l.recovery_pct}%` : 'pending'}</span></td>
                      <td className="r"><button className="link-btn danger" onClick={() => setConfirmDelDose(l)}>Delete</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {retest && <RetestModal entry={retest} onClose={() => setRetest(null)} />}
      {confirmDelDose && (
        <Modal title="Delete dose" onClose={() => setConfirmDelDose(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>Delete the {confirmDelDose.event_date} dose of <b>{confirmDelDose.product_name ?? 'this fertiliser'}</b>?</p>
          <div className="mform-actions">
            <button type="button" className="ghost" onClick={() => setConfirmDelDose(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={delDose.isPending} onClick={() => delDose.mutate(confirmDelDose)}>{delDose.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
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
