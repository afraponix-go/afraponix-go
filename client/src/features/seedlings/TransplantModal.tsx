import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { fetchGrowBeds } from '../growbeds/api'
import { transplantSeedling, type Seedling } from './api'
import './seedlings.css'

const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function TransplantModal({ systemId, seedling, onClose }: { systemId: string; seedling: Seedling; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: beds = [] } = useQuery({ queryKey: ['grow-beds', systemId], queryFn: () => fetchGrowBeds(systemId) })
  const [bedId, setBedId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [count, setCount] = useState(String(seedling.germinated_count ?? seedling.total_sown))
  const [error, setError] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () => transplantSeedling(seedling.id, { grow_bed_id: Number(bedId), transplant_date: date, transplanted_count: Number(count) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seedlings'] })
      qc.invalidateQueries({ queryKey: ['batches'] })
      qc.invalidateQueries({ queryKey: ['plant-batches'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!bedId) return setError('Choose a grow bed.')
    if (!date) return setError('Enter the transplant date.')
    if (!count || Number(count) <= 0) return setError('Enter how many were transplanted.')
    mut.mutate()
  }

  return (
    <Modal title={`Transplant · ${seedling.crop_name ?? 'seedlings'}`} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <p className="seedling-hint">Creates a planting batch in the chosen bed and marks this sowing transplanted.</p>
        <div className="field">
          <label htmlFor="t-bed">Grow bed</label>
          <select id="t-bed" value={bedId} onChange={(e) => setBedId(e.target.value)}>
            <option value="">Select a bed…</option>
            {beds.map((b) => <option key={b.id} value={b.id}>{b.bed_name || `Bed ${b.id}`}</option>)}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="t-date">Transplant date</label>
            <input id="t-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="t-count">Plants transplanted</label>
            <input id="t-count" type="number" min="1" step="1" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
        </div>
        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : 'Transplant'}</button>
        </div>
      </form>
    </Modal>
  )
}
