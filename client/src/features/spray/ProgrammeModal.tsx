import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import {
  fetchProducts,
  fetchCategories,
  createProgramme,
  updateProgramme,
  WEEKDAYS,
  WEEKDAY_LABEL,
  type Programme,
} from './api'
import { CATEGORY_LABEL, FishBadge } from './shared'
import './spray.css'

type Sel = { days: string[]; rate: string }

export function ProgrammeModal({ systemId, programme, onClose }: { systemId: string; programme?: Programme; onClose: () => void }) {
  const qc = useQueryClient()
  const editing = !!programme
  const { data: products = [] } = useQuery({ queryKey: ['spray-products'], queryFn: fetchProducts })
  const { data: cats } = useQuery({ queryKey: ['spray-categories'], queryFn: fetchCategories })
  const defaultDays = cats?.defaultDays ?? {}

  const [name, setName] = useState(programme?.name ?? '')
  const [notes, setNotes] = useState(programme?.notes ?? '')
  const [sel, setSel] = useState<Record<number, Sel>>(() =>
    Object.fromEntries((programme?.products ?? []).map((p) => [p.product_id, { days: p.days, rate: p.rate ?? '' }])),
  )
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const grouped = useMemo(() => {
    const byCat: Record<string, typeof products> = {}
    for (const p of products) {
      if (filter && !`${p.product_name} ${p.active_ingredient ?? ''} ${p.target ?? ''}`.toLowerCase().includes(filter.toLowerCase())) continue
      ;(byCat[p.category] ??= []).push(p)
    }
    return byCat
  }, [products, filter])

  const toggle = (p: { id: number; category: string; default_rate: string | null }) => {
    setSel((s) => {
      const next = { ...s }
      if (next[p.id]) delete next[p.id]
      // Pre-fill the recommended dose from the catalogue (editable).
      else next[p.id] = { days: (defaultDays[p.category] ?? 'mon').split(','), rate: p.default_rate ?? '' }
      return next
    })
  }
  const toggleDay = (productId: number, day: string) => {
    setSel((s) => {
      const cur = s[productId]
      if (!cur) return s
      const days = cur.days.includes(day) ? cur.days.filter((d) => d !== day) : [...cur.days, day]
      return { ...s, [productId]: { ...cur, days } }
    })
  }

  const mut = useMutation({
    mutationFn: () => {
      const input = {
        name: name.trim(),
        notes: notes.trim() || null,
        products: Object.entries(sel).map(([id, v]) => ({ product_id: Number(id), rate: v.rate.trim() || null, days: v.days })),
      }
      return editing ? updateProgramme(programme!.id, input) : createProgramme(systemId, input)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spray-programmes'] })
      qc.invalidateQueries({ queryKey: ['spray-due'] })
      qc.invalidateQueries({ queryKey: ['spray-calendar'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Give the programme a name.')
    if (Object.keys(sel).length === 0) return setError('Add at least one product.')
    mut.mutate()
  }

  const count = Object.keys(sel).length

  return (
    <Modal title={editing ? `Edit ${programme?.name}` : 'New spray programme'} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field">
          <label htmlFor="pm-name">Programme name</label>
          <input id="pm-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer IPM rotation" autoFocus />
        </div>

        <div className="field">
          <label>Products <span className="unit-hint">({count} selected)</span></label>
          <input className="spray-filter" type="search" placeholder="Filter products…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>

        <div className="pm-products">
          {Object.keys(grouped).sort().map((cat) => (
            <div key={cat} className="pm-cat">
              <div className="pm-cat-head">{CATEGORY_LABEL[cat] ?? cat}</div>
              {grouped[cat].map((p) => {
                const on = !!sel[p.id]
                return (
                  <div key={p.id} className={`pm-prod ${on ? 'on' : ''}`}>
                    <label className="pm-prod-main">
                      <input type="checkbox" checked={on} onChange={() => toggle(p)} />
                      <span className="pm-prod-name">{p.product_name}</span>
                      <FishBadge safety={p.fish_safety} note={p.fish_note} />
                    </label>
                    {on && (
                      <div className="pm-prod-cfg">
                        <div className="pm-days">
                          {WEEKDAYS.map((d) => (
                            <button key={d} type="button" className={sel[p.id].days.includes(d) ? 'on' : ''} onClick={() => toggleDay(p.id, d)}>{WEEKDAY_LABEL[d]}</button>
                          ))}
                        </div>
                        <input className="pm-rate" type="text" value={sel[p.id].rate} onChange={(e) => setSel((s) => ({ ...s, [p.id]: { ...s[p.id], rate: e.target.value } }))} placeholder={p.default_rate ?? 'rate'} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="field">
          <label htmlFor="pm-notes">Notes</label>
          <textarea id="pm-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : editing ? 'Save programme' : 'Create programme'}</button>
        </div>
      </form>
    </Modal>
  )
}
