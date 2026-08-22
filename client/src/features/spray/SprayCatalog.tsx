import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import {
  fetchProducts,
  fetchCategories,
  addProduct,
  updateProduct,
  deleteProduct,
  type SprayProduct,
  type FishSafety,
  type ProductInput,
} from './api'
import { CATEGORY_LABEL, FishBadge } from './shared'
import './spray.css'

const FISH_OPTS: FishSafety[] = ['safe', 'caution', 'toxic']

function ProductModal({ product, onClose }: { product?: SprayProduct; onClose: () => void }) {
  const qc = useQueryClient()
  const editing = !!product
  const { data: cats } = useQuery({ queryKey: ['spray-categories'], queryFn: fetchCategories })
  const categories = cats?.categories ?? []
  const [f, setF] = useState({
    category: product?.category ?? 'insecticides',
    product_name: product?.product_name ?? '',
    active_ingredient: product?.active_ingredient ?? '',
    target: product?.target ?? '',
    default_rate: product?.default_rate ?? '',
    interval_days: product?.interval_days != null ? String(product.interval_days) : '',
    fish_safety: (product?.fish_safety ?? 'caution') as FishSafety,
    fish_note: product?.fish_note ?? '',
    compatibility_notes: product?.compatibility_notes ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))

  const mut = useMutation({
    mutationFn: () => {
      const input: ProductInput = {
        category: f.category,
        product_name: f.product_name.trim(),
        active_ingredient: f.active_ingredient.trim() || null,
        target: f.target.trim() || null,
        default_rate: f.default_rate.trim() || null,
        interval_days: f.interval_days ? Number(f.interval_days) : null,
        fish_safety: f.fish_safety,
        fish_note: f.fish_note.trim() || null,
        compatibility_notes: f.compatibility_notes.trim() || null,
      }
      return editing ? updateProduct(product!.id, input) : addProduct(input)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['spray-products'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!f.product_name.trim()) return setError('Enter a product name.')
    mut.mutate()
  }

  return (
    <Modal title={editing ? `Edit ${product?.product_name}` : 'Add product'} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field-row">
          <div className="field">
            <label htmlFor="pr-name">Product name</label>
            <input id="pr-name" type="text" value={f.product_name} onChange={(e) => set('product_name', e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="pr-cat">Category</label>
            <select id="pr-cat" value={f.category} onChange={(e) => set('category', e.target.value)}>
              {categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="pr-ai">Active ingredient</label>
          <input id="pr-ai" type="text" value={f.active_ingredient} onChange={(e) => set('active_ingredient', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pr-target">Target (pest / disease / nutrient)</label>
          <input id="pr-target" type="text" value={f.target} onChange={(e) => set('target', e.target.value)} />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="pr-rate">Default rate</label>
            <input id="pr-rate" type="text" value={f.default_rate} onChange={(e) => set('default_rate', e.target.value)} placeholder="e.g. 100 ml / 10L" />
          </div>
          <div className="field">
            <label htmlFor="pr-int">Interval (days)</label>
            <input id="pr-int" type="number" min="1" value={f.interval_days} onChange={(e) => set('interval_days', e.target.value)} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="pr-fish">Fish safety</label>
            <select id="pr-fish" value={f.fish_safety} onChange={(e) => set('fish_safety', e.target.value)}>
              {FISH_OPTS.map((o) => <option key={o} value={o}>{o === 'safe' ? 'Fish-safe' : o === 'caution' ? 'Caution' : 'Fish-toxic'}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pr-fishnote">Fish-safety note</label>
            <input id="pr-fishnote" type="text" value={f.fish_note} onChange={(e) => set('fish_note', e.target.value)} placeholder="why / precautions" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pr-compat">Compatibility notes</label>
          <textarea id="pr-compat" rows={2} value={f.compatibility_notes} onChange={(e) => set('compatibility_notes', e.target.value)} />
        </div>
        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : editing ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </Modal>
  )
}

export function SprayCatalog() {
  const qc = useQueryClient()
  const { data: products = [], isLoading } = useQuery({ queryKey: ['spray-products'], queryFn: fetchProducts })
  const [modal, setModal] = useState<{ product?: SprayProduct } | null>(null)
  const [confirmDel, setConfirmDel] = useState<SprayProduct | null>(null)
  const [filter, setFilter] = useState('')
  const del = useMutation({
    mutationFn: (p: SprayProduct) => deleteProduct(p.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['spray-products'] }); setConfirmDel(null) },
  })

  const grouped = useMemo(() => {
    const byCat: Record<string, SprayProduct[]> = {}
    for (const p of products) {
      if (filter && !`${p.product_name} ${p.active_ingredient ?? ''} ${p.target ?? ''}`.toLowerCase().includes(filter.toLowerCase())) continue
      ;(byCat[p.category] ??= []).push(p)
    }
    return byCat
  }, [products, filter])

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Product catalogue</h2>
        <button className="btn feed-btn" onClick={() => setModal({})}>+ Add product</button>
      </div>
      <p className="spray-lead">Reference products from the BCF plan, plus any you add. The fish‑safety flag is guidance for a stocked system — always avoid overspray and runoff into the water.</p>
      <input className="crop-search" type="search" placeholder="Search products…" value={filter} onChange={(e) => setFilter(e.target.value)} />

      {isLoading ? <div className="empty">Loading…</div> : (
        <div className="cat-groups">
          {Object.keys(grouped).sort().map((cat) => (
            <div key={cat} className="cat-group">
              <h3 className="cat-group-title">{CATEGORY_LABEL[cat] ?? cat}</h3>
              <div className="cat-list">
                {grouped[cat].map((p) => (
                  <div key={p.id} className="cat-item">
                    <div className="cat-item-head">
                      <span className="cat-item-name">{p.product_name}{p.custom && <span className="cat-custom">custom</span>}</span>
                      <FishBadge safety={p.fish_safety} note={p.fish_note} />
                      {p.custom && (
                        <span className="crop-card-actions">
                          <button className="link-btn" onClick={() => setModal({ product: p })}>Edit</button>
                          <button className="link-btn danger" onClick={() => setConfirmDel(p)}>Delete</button>
                        </span>
                      )}
                    </div>
                    <div className="cat-item-meta">
                      {p.active_ingredient && <span>{p.active_ingredient}</span>}
                      {p.default_rate && <span>· {p.default_rate}</span>}
                      {p.interval_days != null && <span>· every {p.interval_days}d</span>}
                    </div>
                    {p.target && <div className="cat-item-target">Target: {p.target}</div>}
                    {p.fish_note && <div className="cat-item-fishnote">🐟 {p.fish_note}</div>}
                    {p.compatibility_notes && <div className="cat-item-notes">{p.compatibility_notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <ProductModal product={modal.product} onClose={() => setModal(null)} />}
      {confirmDel && (
        <Modal title="Delete product" onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>Delete <b>{confirmDel.product_name}</b> from your catalogue?</p>
          <div className="mform-actions">
            <button type="button" className="ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={del.isPending} onClick={() => del.mutate(confirmDel)}>{del.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
