import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { useSystems } from '../systems/SystemContext'
import { fetchCropOptions } from './crops'
import { saveAllocation, updateAllocation, plantsForAllocation, type Allocation } from './api'
import type { GrowBedConfig } from '../growbeds/api'

const today = () => new Date().toISOString().slice(0, 10)

export function AllocationModal({
  bed,
  allocation,
  usedByOthers,
  onClose,
}: {
  bed: GrowBedConfig
  allocation?: Allocation
  usedByOthers: number
  onClose: () => void
}) {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const editing = !!allocation
  const isVertical = (bed.bed_type ?? '').toLowerCase() === 'vertical'
  const availableMax = Math.max(0, Math.round((100 - usedByOthers) * 10) / 10)

  const { data: crops = [] } = useQuery({ queryKey: ['crop-options', activeId], queryFn: () => fetchCropOptions(activeId as string), enabled: !!activeId })

  const [crop, setCrop] = useState(allocation?.crop_type ?? '')
  const [pct, setPct] = useState(allocation?.percentage_allocated != null ? String(allocation.percentage_allocated) : '')
  const [spacing, setSpacing] = useState(allocation?.plant_spacing != null ? String(allocation.plant_spacing) : '30')
  const [date, setDate] = useState(allocation?.date_planted?.slice(0, 10) ?? today())
  const [error, setError] = useState<string | null>(null)

  const estimate = useMemo(() => plantsForAllocation(bed, Number(pct) || 0, Number(spacing) || 30), [bed, pct, spacing])

  function pickCrop(value: string) {
    setCrop(value)
    const def = crops.find((c) => c.value === value)
    if (def?.plant_spacing_cm != null) setSpacing(String(def.plant_spacing_cm))
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (editing) {
        return updateAllocation(allocation.id, { cropType: crop, percentageAllocated: Number(pct), plantsPlanted: estimate })
      }
      return saveAllocation({
        systemId: activeId as string,
        growBedId: bed.id,
        cropType: crop,
        percentageAllocated: Number(pct),
        plantsPlanted: estimate,
        datePlanted: date || undefined,
        plantSpacing: Number(spacing) || 30,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allocations'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!crop) return setError('Choose a crop.')
    const p = Number(pct)
    if (!(p > 0)) return setError('Enter a percentage of the bed.')
    if (p > availableMax + 0.05) return setError(`Only ${availableMax}% of this bed is free.`)
    mutation.mutate()
  }

  return (
    <Modal title={`${editing ? 'Edit' : 'Add'} allocation — ${bed.bed_name ?? `Bed ${bed.bed_number ?? bed.id}`}`} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}

        <div className="field">
          <label htmlFor="al-crop">Crop</label>
          <select id="al-crop" value={crop} onChange={(e) => pickCrop(e.target.value)} disabled={editing} autoFocus={!editing}>
            <option value="">Select a crop…</option>
            {crops.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="al-pct">% of bed <span className="unit-hint">· up to {availableMax}%</span></label>
            <input id="al-pct" type="number" min="0" max={availableMax} step="any" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} placeholder={`0–${availableMax}`} />
          </div>
          {!isVertical && (
            <div className="field">
              <label htmlFor="al-spacing">Plant spacing <span className="unit-hint">(cm)</span></label>
              <input id="al-spacing" type="number" min="1" step="any" inputMode="decimal" value={spacing} onChange={(e) => setSpacing(e.target.value)} placeholder="30" />
            </div>
          )}
        </div>

        <div className="unit-hint" style={{ marginTop: -4 }}>
          ≈ <b style={{ color: 'var(--ink)' }}>{estimate.toLocaleString()}</b> plants
          {isVertical ? ' (scaled by tower count)' : ` at ${Number(spacing) || 30} cm spacing`}
        </div>

        {!editing && (
          <div className="field">
            <label htmlFor="al-date">Date planted <span className="unit-hint">· optional</span></label>
            <input id="al-date" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        )}

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add allocation'}</button>
        </div>
      </form>
    </Modal>
  )
}
