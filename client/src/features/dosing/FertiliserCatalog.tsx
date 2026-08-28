import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { fetchFertilisers, deleteFertiliser, addFertiliser, DEFAULT_BUFFERS, NUTRIENT_OPTS, type Fertiliser } from './api'
import { AddFertiliserModal } from './AddFertiliserModal'
import { DEFAULT_PRODUCTS } from '../calculator/nutrientDosing'
import '../spray/spray.css'
import './dosing.css'

const composition = (f: Fertiliser) =>
  NUTRIENT_OPTS.map((o) => ({ o, v: (f as unknown as Record<string, number>)[o.key] || 0 }))
    .filter((x) => x.v > 0)
    .map((x) => `${x.o.short} ${x.v}%`)
    .join(' · ')

const doseText = (f: Fertiliser) =>
  f.rate_amount != null ? `${Number(f.rate_amount)} ${f.rate_unit ?? 'g'}${f.rate_per_volume != null ? ` / ${Number(f.rate_per_volume)} L` : ''}` : null

const phText = (f: Fertiliser) =>
  f.ph_direction ? `${f.ph_direction === 'down' ? 'Lowers pH' : 'Raises pH'}${f.ph_strength != null ? ` · ${Number(f.ph_strength)} ${f.rate_unit ?? 'ml'}/1000 L/pH` : ''}` : null

// The dosing fertiliser catalogue (dosing_products): nutrient content + dose.
export function FertiliserCatalog() {
  const qc = useQueryClient()
  const { data: ferts = [], isLoading } = useQuery({ queryKey: ['dosing-fertilisers'], queryFn: fetchFertilisers })
  const [modal, setModal] = useState<{ fertiliser?: Fertiliser } | null>(null)
  const [confirmDel, setConfirmDel] = useState<Fertiliser | null>(null)
  const [filter, setFilter] = useState('')
  const del = useMutation({
    mutationFn: (f: Fertiliser) => deleteFertiliser(f.id as number),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dosing-fertilisers'] }); qc.invalidateQueries({ queryKey: ['dosing-products'] }); setConfirmDel(null) },
  })
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['dosing-fertilisers'] }); qc.invalidateQueries({ queryKey: ['dosing-products'] }) }
  // Additive: add each default fertiliser (upsert by name) without touching the
  // rest of the catalogue — so loading defaults never wipes your pH buffers or
  // custom fertilisers.
  const loadDefaults = useMutation({
    mutationFn: async () => {
      for (const p of DEFAULT_PRODUCTS) await addFertiliser({ name: p.name, n: p.n, p: p.p, k: p.k, ca: p.ca, mg: p.mg, fe: p.fe })
    },
    onSuccess: invalidate,
  })
  const loadBuffers = useMutation({ mutationFn: async () => { for (const b of DEFAULT_BUFFERS) await addFertiliser(b) }, onSuccess: invalidate })
  const missingDefaults = DEFAULT_PRODUCTS.some((p) => !ferts.some((f) => f.name === p.name))

  const shown = useMemo(() => ferts.filter((f) => !filter || f.name.toLowerCase().includes(filter.toLowerCase())), [ferts, filter])

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Fertilisers</h2>
        <button className="btn feed-btn" onClick={() => setModal({})}>+ Add fertiliser</button>
      </div>
      <p className="spray-lead">Your dosing fertilisers — nutrient content and a dose rate. These feed the Nutrient Dosing calculator and dosing programmes.</p>
      <input className="crop-search" type="search" placeholder="Search fertilisers…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="cat-load-links">
        {ferts.length > 0 && missingDefaults && (
          <button type="button" className="link-btn" disabled={loadDefaults.isPending} onClick={() => loadDefaults.mutate()}>
            {loadDefaults.isPending ? 'Loading…' : '+ Load default fertilisers (Calcium Nitrate, MKP, Magnesium Sulphate, Iron…)'}
          </button>
        )}
        {ferts.length > 0 && !ferts.some((f) => f.ph_direction) && (
          <button type="button" className="link-btn" disabled={loadBuffers.isPending} onClick={() => loadBuffers.mutate()}>
            {loadBuffers.isPending ? 'Loading…' : '+ Load default pH buffers (Nitric, Phosphoric, KOH, Ca(OH)₂…)'}
          </button>
        )}
      </div>

      {isLoading ? <div className="empty">Loading…</div> : shown.length === 0 ? (
        filter ? <div className="empty">No fertilisers match.</div> : (
          <div className="empty">
            <p style={{ margin: '0 0 14px' }}>No fertilisers yet — the calculator is using its built-in defaults. Load them here to view and edit them, or add your own.</p>
            <button type="button" className="btn" style={{ width: 'auto' }} disabled={loadDefaults.isPending} onClick={() => loadDefaults.mutate()}>
              {loadDefaults.isPending ? 'Loading…' : 'Load default fertilisers'}
            </button>
          </div>
        )
      ) : (
        <div className="cat-list" style={{ marginTop: 12 }}>
          {shown.map((f) => (
            <div key={f.id} className="cat-item">
              <div className="cat-item-head">
                <span className="cat-item-name">{f.name}</span>
                {f.ph_direction && <span className={`dp-mix ${f.ph_direction === 'down' ? 'mix-B' : 'mix-A'}`}>{f.ph_direction === 'down' ? 'pH ↓' : 'pH ↑'}</span>}
                <span className="crop-card-actions">
                  <button className="link-btn" onClick={() => setModal({ fertiliser: f })}>Edit</button>
                  <button className="link-btn danger" onClick={() => setConfirmDel(f)}>Delete</button>
                </span>
              </div>
              <div className="cat-item-meta">
                {f.ph_direction
                  ? <><span>{phText(f)}</span>{composition(f) && <span>· adds {composition(f)}</span>}</>
                  : <><span>{composition(f) || 'no nutrient content set'}</span>{doseText(f) && <span>· dose {doseText(f)}</span>}</>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <AddFertiliserModal fertiliser={modal.fertiliser} onClose={() => setModal(null)} />}
      {confirmDel && (
        <Modal title="Delete fertiliser" onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>Delete <b>{confirmDel.name}</b> from your fertilisers? Dosing programmes that reference it by name keep working.</p>
          <div className="mform-actions">
            <button type="button" className="ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={del.isPending} onClick={() => del.mutate(confirmDel)}>{del.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
