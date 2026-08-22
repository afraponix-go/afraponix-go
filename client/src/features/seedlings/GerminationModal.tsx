import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { updateSeedling, germPct, type Seedling } from './api'
import './seedlings.css'

const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function GerminationModal({ seedling, onClose }: { seedling: Seedling; onClose: () => void }) {
  const qc = useQueryClient()
  const [date, setDate] = useState(seedling.germination_date ?? todayISO())
  const [count, setCount] = useState(seedling.germinated_count != null ? String(seedling.germinated_count) : '')
  const [error, setError] = useState<string | null>(null)

  const pct = count && seedling.total_sown ? Math.round((Number(count) / seedling.total_sown) * 1000) / 10 : null

  const mut = useMutation({
    mutationFn: () => updateSeedling(seedling.id, { germination_date: date, germinated_count: count === '' ? null : Number(count) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seedlings'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!date) return setError('Enter the germination date.')
    mut.mutate()
  }

  return (
    <Modal title={`Record germination · ${seedling.crop_name ?? 'seedlings'}`} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <p className="seedling-hint">Sown {seedling.sow_date} · {seedling.total_sown.toLocaleString()} seeds{seedling.predicted_germ_days != null ? ` · predicted ${seedling.predicted_germ_days} days` : ''}</p>
        <div className="field-row">
          <div className="field">
            <label htmlFor="g-date">Germination date</label>
            <input id="g-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="g-count">Germinated count</label>
            <input id="g-count" type="number" min="0" step="1" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} placeholder={String(seedling.total_sown)} />
          </div>
        </div>
        {pct != null && <p className="seedling-hint">Germination: <b>{pct}%</b>{seedling.predicted_germ_days != null ? ` · ${Math.max(0, Math.round((new Date(date).getTime() - new Date(seedling.sow_date).getTime()) / 86400000))} days actual vs ${seedling.predicted_germ_days} predicted` : ''}</p>}
        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : 'Record'}</button>
        </div>
      </form>
    </Modal>
  )
}

export function germLabel(s: Seedling): string {
  const p = germPct(s)
  return p != null ? `${p}% germinated` : 'not recorded'
}
