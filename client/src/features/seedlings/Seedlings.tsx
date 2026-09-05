import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { Modal } from '../../components/Modal'
import { fetchSeedlings, deleteSeedling, germPct, type Seedling } from './api'
import { SowModal } from './SowModal'
import { GerminationModal } from './GerminationModal'
import { TransplantModal } from './TransplantModal'
import { LabelPrintModal } from '../plants/LabelPrintModal'
import { BatchPhotoModal } from '../plants/BatchPhotoModal'
import { seedlingScanUrl } from '../plants/batchQr'
import { ViewToggle, useViewMode } from '../../components/ViewToggle'
import '../water/water.css'
import './seedlings.css'

const STATUS_LABEL: Record<string, string> = { sown: 'Sown', germinated: 'Germinated', partially_transplanted: 'Partly transplanted', transplanted: 'Transplanted' }

// Seedlings still awaiting a bed (germinated count, else total sown) minus what's
// already gone out.
function seedlingsLeft(s: Seedling): number {
  return Math.max(0, (s.germinated_count ?? s.total_sown) - (s.transplanted_count ?? 0))
}

// How the transplant state reads on a card/row.
function transplantText(s: Seedling): string {
  const done = s.transplanted_count ?? 0
  if (s.status === 'transplanted') return `${done.toLocaleString()} on ${s.transplant_date}${s.actual_transplant_days != null ? ` · ${s.actual_transplant_days}d` : ''}`
  if (s.status === 'partially_transplanted') return `${done.toLocaleString()} placed · ${seedlingsLeft(s).toLocaleString()} left`
  return s.predicted_transplant_date ? `by ${s.predicted_transplant_date}` : '—'
}

function readiness(s: Seedling): { text: string; cls: string } | null {
  if (s.status === 'transplanted') return null
  if (s.days_to_transplant_remaining == null) return null
  if (s.days_to_transplant_remaining <= 0) return { text: 'Ready to transplant', cls: 'ready' }
  return { text: `Transplant in ${s.days_to_transplant_remaining} day${s.days_to_transplant_remaining === 1 ? '' : 's'}`, cls: 'soon' }
}

export function Seedlings() {
  const { activeFarmId, systems } = useSystems()
  const [view] = useViewMode()
  const qc = useQueryClient()
  const [sow, setSow] = useState<{ seedling?: Seedling } | null>(null)
  const [germ, setGerm] = useState<Seedling | null>(null)
  const [transplant, setTransplant] = useState<Seedling | null>(null)
  const [labelFor, setLabelFor] = useState<Seedling | null>(null)
  const [photoFor, setPhotoFor] = useState<Seedling | null>(null)
  const [confirmDel, setConfirmDel] = useState<Seedling | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [filter, setFilter] = useState<'all' | 'ready' | 'nursery' | 'transplanted'>('all')

  const { data: seedlings = [], isLoading } = useQuery({ queryKey: ['seedlings', activeFarmId], queryFn: () => fetchSeedlings(activeFarmId as string), enabled: !!activeFarmId })
  const del = useMutation({
    mutationFn: (s: Seedling) => deleteSeedling(s.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seedlings'] }); setConfirmDel(null) },
  })

  if (!activeFarmId) return <div className="empty">Pick a farm to see its seedling bay.</div>

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
        {s.batch_number && <div className="seedling-batchno">{s.batch_number}</div>}
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
            <span className="v">{transplantText(s)}</span>
          </div>
        </div>
        {rd && <div className={`seedling-ready ${rd.cls}`}>{rd.text}</div>}
        <div className="seedling-actions">
          {s.status !== 'transplanted' && <button className="row-btn" onClick={() => setGerm(s)}>{s.germinated_count != null ? 'Edit germination' : 'Record germination'}</button>}
          {s.status !== 'transplanted' && <button className="row-btn" onClick={() => setTransplant(s)}>Transplant</button>}
          <span className="seedling-links">
            <button className="link-btn" onClick={() => setLabelFor(s)}>Label</button>
            <button className="link-btn" onClick={() => setPhotoFor(s)}>Photo</button>
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
        <span className="dr-name">{s.crop_name ?? 'Crop'}{s.seed_variety ? ` · ${s.seed_variety}` : ''}{s.batch_number ? <span className="seedling-batchno inline"> {s.batch_number}</span> : null}</span>
        <span className="dr-meta">{s.total_sown.toLocaleString()} sown{pct != null ? ` · ${pct}% germ` : ''}</span>
        <span className="dr-tp">→ {(s.transplanted_count ?? 0).toLocaleString()} on {s.transplant_date}{s.actual_transplant_days != null ? ` · ${s.actual_transplant_days}d` : ''}</span>
        <span className="dr-actions">
          <button className="link-btn" onClick={() => setLabelFor(s)}>Label</button>
            <button className="link-btn" onClick={() => setPhotoFor(s)}>Photo</button>
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
                <td className="op-text">{s.crop_name ?? 'Crop'}{s.batch_number ? <div className="seedling-batchno">{s.batch_number}</div> : null}</td>
                <td className="op-text">{s.seed_variety ?? '—'}</td>
                <td><span className={`seedling-badge st-${s.status}`}>{STATUS_LABEL[s.status] ?? s.status}</span></td>
                <td className="op-text">{s.sow_date}</td>
                <td>{s.total_sown.toLocaleString()}</td>
                <td>{pct != null ? `${pct}%` : '—'}</td>
                <td className="op-text">
                  {s.status === 'transplanted' || s.status === 'partially_transplanted'
                    ? transplantText(s)
                    : rd ? rd.text : s.predicted_transplant_date ? `by ${s.predicted_transplant_date}` : '—'}
                </td>
                <td className="row-actions">
                  {s.status !== 'transplanted' && <button className="link-btn" onClick={() => setGerm(s)}>Germ.</button>}
                  {s.status !== 'transplanted' && <button className="link-btn" onClick={() => setTransplant(s)}>Transplant</button>}
                  <button className="link-btn" onClick={() => setLabelFor(s)}>Label</button>
            <button className="link-btn" onClick={() => setPhotoFor(s)}>Photo</button>
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
          <Link to="/scan" className="ghost">Scan</Link>
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

      {sow && activeFarmId && <SowModal farmId={activeFarmId} systemId={systems[0]?.id} seedling={sow.seedling} onClose={() => setSow(null)} />}
      {germ && <GerminationModal seedling={germ} onClose={() => setGerm(null)} />}
      {transplant && <TransplantModal systems={systems} seedling={transplant} onClose={() => setTransplant(null)} />}
      {labelFor && activeFarmId && (
        <LabelPrintModal
          url={seedlingScanUrl(activeFarmId, labelFor.id)}
          title={labelFor.batch_number ?? labelFor.crop_name ?? 'Batch'}
          line1={`${labelFor.crop_name ?? 'Crop'}${labelFor.seed_variety ? ` · ${labelFor.seed_variety}` : ''}`}
          line2={`Sown ${labelFor.sow_date}`}
          onClose={() => setLabelFor(null)}
        />
      )}
      {photoFor && (
        <BatchPhotoModal
          seedlingId={photoFor.id}
          title={photoFor.batch_number ?? photoFor.crop_name ?? 'Seedling'}
          cropType={photoFor.crop_name}
          onClose={() => setPhotoFor(null)}
        />
      )}
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
