import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { Modal } from '../../components/Modal'
import { fetchSeedlings, deleteSeedling, germPct, type Seedling } from './api'
import { SowModal } from './SowModal'
import { GerminationModal } from './GerminationModal'
import { TransplantModal } from './TransplantModal'
import { ViewToggle, useViewMode } from '../../components/ViewToggle'
import '../water/water.css'
import './seedlings.css'

const STATUS_LABEL: Record<string, string> = { sown: 'Sown', germinated: 'Germinated', transplanted: 'Transplanted' }

function readiness(s: Seedling): { text: string; cls: string } | null {
  if (s.status === 'transplanted') return null
  if (s.days_to_transplant_remaining == null) return null
  if (s.days_to_transplant_remaining <= 0) return { text: 'Ready to transplant', cls: 'ready' }
  return { text: `Transplant in ${s.days_to_transplant_remaining} day${s.days_to_transplant_remaining === 1 ? '' : 's'}`, cls: 'soon' }
}

export function Seedlings() {
  const { activeId } = useSystems()
  const [view] = useViewMode()
  const qc = useQueryClient()
  const [sow, setSow] = useState<{ seedling?: Seedling } | null>(null)
  const [germ, setGerm] = useState<Seedling | null>(null)
  const [transplant, setTransplant] = useState<Seedling | null>(null)
  const [confirmDel, setConfirmDel] = useState<Seedling | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [filter, setFilter] = useState<'all' | 'ready' | 'nursery' | 'transplanted'>('all')

  const { data: seedlings = [], isLoading } = useQuery({ queryKey: ['seedlings', activeId], queryFn: () => fetchSeedlings(activeId as string), enabled: !!activeId })
  const del = useMutation({
    mutationFn: (s: Seedling) => deleteSeedling(s.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seedlings'] }); setConfirmDel(null) },
  })

  if (!activeId) return <div className="empty">Select a system to track seedlings.</div>

  const active = seedlings.filter((s) => s.status !== 'transplanted')
  const germRates = seedlings.map(germPct).filter((p): p is number => p != null)
  const avgGerm = germRates.length ? Math.round((germRates.reduce((a, b) => a + b, 0) / germRates.length) * 10) / 10 : null

  const rem = (s: Seedling) => s.days_to_transplant_remaining ?? 999
  const ready = active.filter((s) => rem(s) <= 0).sort((a, b) => rem(a) - rem(b))
  const nursery = active.filter((s) => rem(s) > 0).sort((a, b) => rem(a) - rem(b))
  const transplanted = seedlings.filter((s) => s.status === 'transplanted').sort((a, b) => (b.transplant_date ?? '').localeCompare(a.transplant_date ?? ''))

  const card = (s: Seedling) => {
    const pct = germPct(s)
    const rd = readiness(s)
    return (
      <div key={s.id} className={`seedling-card ${s.status === 'transplanted' ? 'done' : ''}`}>
        <div className="seedling-card-head">
          <span className="seedling-name">{s.crop_name ?? 'Crop'}{s.seed_variety ? ` · ${s.seed_variety}` : ''}</span>
          <span className={`seedling-badge st-${s.status}`}>{STATUS_LABEL[s.status] ?? s.status}</span>
        </div>
        <div className="seedling-meta">Sown {s.sow_date} · {
          s.tray_groups.length === 1
            ? `${s.tray_groups[0].trays} tray${s.tray_groups[0].trays === 1 ? '' : 's'} × ${s.tray_groups[0].cells}`
            : s.tray_groups.map((g) => `${g.trays}×${g.cells}`).join(' + ')
        } = <b>{s.total_sown.toLocaleString()}</b></div>
        <div className="seedling-facts">
          <div className="seedling-fact">
            <span className="k">Germination</span>
            <span className="v">{pct != null ? `${pct}%` : '—'}{s.actual_germ_days != null ? ` · ${s.actual_germ_days}d actual` : ''}{s.predicted_germ_days != null ? ` / ${s.predicted_germ_days}d pred.` : ''}</span>
          </div>
          <div className="seedling-fact">
            <span className="k">Transplant</span>
            <span className="v">
              {s.status === 'transplanted'
                ? `${(s.transplanted_count ?? 0).toLocaleString()} on ${s.transplant_date}${s.actual_transplant_days != null ? ` · ${s.actual_transplant_days}d` : ''}`
                : s.predicted_transplant_date ? `by ${s.predicted_transplant_date}` : '—'}
            </span>
          </div>
        </div>
        {rd && <div className={`seedling-ready ${rd.cls}`}>{rd.text}</div>}
        <div className="seedling-actions">
          {s.status !== 'transplanted' && <button className="row-btn" onClick={() => setGerm(s)}>{s.germinated_count != null ? 'Edit germination' : 'Record germination'}</button>}
          {s.status !== 'transplanted' && <button className="row-btn" onClick={() => setTransplant(s)}>Transplant</button>}
          <span className="seedling-links">
            <button className="link-btn" onClick={() => setSow({ seedling: s })}>Edit</button>
            <button className="link-btn danger" onClick={() => setConfirmDel(s)}>Delete</button>
          </span>
        </div>
      </div>
    )
  }

  const doneRow = (s: Seedling) => {
    const pct = germPct(s)
    return (
      <div key={s.id} className="seedling-done-row">
        <span className="dr-name">{s.crop_name ?? 'Crop'}{s.seed_variety ? ` · ${s.seed_variety}` : ''}</span>
        <span className="dr-meta">{s.total_sown.toLocaleString()} sown{pct != null ? ` · ${pct}% germ` : ''}</span>
        <span className="dr-tp">→ {(s.transplanted_count ?? 0).toLocaleString()} on {s.transplant_date}{s.actual_transplant_days != null ? ` · ${s.actual_transplant_days}d` : ''}</span>
        <span className="dr-actions">
          <button className="link-btn" onClick={() => setSow({ seedling: s })}>Edit</button>
          <button className="link-btn danger" onClick={() => setConfirmDel(s)}>Delete</button>
        </span>
      </div>
    )
  }

  const listTable = (items: Seedling[]) => (
    <div className="wq-table-wrap">
      <table className="wq-table op-table">
        <thead>
          <tr>
            <th>Crop</th>
            <th>Variety</th>
            <th>Status</th>
            <th>Sown</th>
            <th>Total</th>
            <th>Germ.</th>
            <th>Transplant</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => {
            const pct = germPct(s)
            const rd = readiness(s)
            return (
              <tr key={s.id}>
                <td className="op-text">{s.crop_name ?? 'Crop'}</td>
                <td className="op-text">{s.seed_variety ?? '—'}</td>
                <td><span className={`seedling-badge st-${s.status}`}>{STATUS_LABEL[s.status] ?? s.status}</span></td>
                <td className="op-text">{s.sow_date}</td>
                <td>{s.total_sown.toLocaleString()}</td>
                <td>{pct != null ? `${pct}%` : '—'}</td>
                <td className="op-text">
                  {s.status === 'transplanted'
                    ? `${(s.transplanted_count ?? 0).toLocaleString()} on ${s.transplant_date}`
                    : rd ? rd.text : s.predicted_transplant_date ? `by ${s.predicted_transplant_date}` : '—'}
                </td>
                <td className="row-actions">
                  {s.status !== 'transplanted' && <button className="link-btn" onClick={() => setGerm(s)}>Germ.</button>}
                  {s.status !== 'transplanted' && <button className="link-btn" onClick={() => setTransplant(s)}>Transplant</button>}
                  <button className="link-btn" onClick={() => setSow({ seedling: s })}>Edit</button>
                  <button className="link-btn danger" onClick={() => setConfirmDel(s)}>Delete</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Seedlings</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <ViewToggle />
          <button className="btn feed-btn" onClick={() => setSow({})}>+ New sowing</button>
        </div>
      </div>
      <p className="seedling-lead">Track nursery batches from sowing to transplant — germination %, days to germinate, and time to transplant.</p>

      {seedlings.length > 0 && (
        <div className="seedling-summary">
          <div className="seedling-stat"><b>{active.length}</b><span>in nursery</span></div>
          <div className="seedling-stat"><b>{avgGerm != null ? `${avgGerm}%` : '—'}</b><span>avg germination</span></div>
          <div className="seedling-stat"><b>{ready.length}</b><span>ready to transplant</span></div>
        </div>
      )}

      {seedlings.length > 0 && (
        <div className="seedling-filter" role="group" aria-label="Filter">
          {([
            { key: 'all', label: 'All', n: seedlings.length },
            { key: 'ready', label: 'Ready', n: ready.length },
            { key: 'nursery', label: 'In nursery', n: nursery.length },
            { key: 'transplanted', label: 'Transplanted', n: transplanted.length },
          ] as const).map((f) => (
            <button key={f.key} type="button" className={filter === f.key ? 'active' : ''} onClick={() => setFilter(f.key)}>
              {f.label} <span className="sf-count">{f.n}</span>
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="empty">Loading…</div>
      ) : seedlings.length === 0 ? (
        <div className="empty">No sowings yet. Add one to start tracking germination and transplant timing.</div>
      ) : (
        <>
          {(filter === 'all' || filter === 'ready') && ready.length > 0 && (
            <section className="seedling-section">
              {filter === 'all' && <div className="seedling-section-head ready"><h3>Ready to transplant</h3><span className="seedling-section-count">{ready.length}</span></div>}
              {view === 'list' ? listTable(ready) : <div className="seedling-cards">{ready.map(card)}</div>}
            </section>
          )}

          {(filter === 'all' || filter === 'nursery') && nursery.length > 0 && (
            <section className="seedling-section">
              {filter === 'all' && <div className="seedling-section-head"><h3>In nursery</h3><span className="seedling-section-count">{nursery.length}</span></div>}
              {view === 'list' ? listTable(nursery) : <div className="seedling-cards">{nursery.map(card)}</div>}
            </section>
          )}

          {(filter === 'all' || filter === 'transplanted') && transplanted.length > 0 && (
            <section className="seedling-section">
              {filter === 'all' ? (
                <button type="button" className="seedling-done-toggle" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
                  <span className={`seedling-chev ${showDone ? 'open' : ''}`} aria-hidden>▸</span>
                  Transplanted <span className="seedling-section-count">{transplanted.length}</span>
                </button>
              ) : null}
              {(filter === 'transplanted' || showDone) && (view === 'list' ? listTable(transplanted) : <div className="seedling-done-list">{transplanted.map(doneRow)}</div>)}
            </section>
          )}

          {filter === 'ready' && ready.length === 0 && <div className="empty">Nothing ready to transplant.</div>}
          {filter === 'nursery' && nursery.length === 0 && <div className="empty">Nothing in the nursery.</div>}
        </>
      )}

      {sow && activeId && <SowModal systemId={activeId} seedling={sow.seedling} onClose={() => setSow(null)} />}
      {germ && <GerminationModal seedling={germ} onClose={() => setGerm(null)} />}
      {transplant && activeId && <TransplantModal systemId={activeId} seedling={transplant} onClose={() => setTransplant(null)} />}
      {confirmDel && (
        <Modal title="Delete sowing" onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>Delete this {confirmDel.crop_name ?? 'seedling'} sowing? Any bed planting already created from it is kept.</p>
          <div className="mform-actions">
            <button type="button" className="ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={del.isPending} onClick={() => del.mutate(confirmDel)}>{del.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
