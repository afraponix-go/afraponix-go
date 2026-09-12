import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { useSystems } from '../systems/SystemContext'
import { recordHarvest } from './plantGrowth'
import { prettyCrop } from './api'
import { fetchCustomCrops } from './cropsAdmin'
import type { Batch } from './batches'

const today = () => new Date().toISOString().slice(0, 10)
const QUALITIES = ['excellent', 'good', 'fair', 'poor']

// Quick re-harvest-interval presets. 'none' = just log this pick, don't
// touch the batch's harvest countdown. 'custom' reveals a day-count input.
type ReharvestChoice = 'none' | 7 | 14 | 'custom'

export function HarvestModal({ batch, onClose }: { batch: Batch; onClose: () => void }) {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const [date, setDate] = useState(today())
  const [plants, setPlants] = useState('')
  const [weight, setWeight] = useState('')
  const [quality, setQuality] = useState('good')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // The crop's configured re-harvest interval (cut-and-come-again crops like
  // spinach/herbs), if any — used only to default the prompt below.
  const { data: crops = [] } = useQuery({ queryKey: ['custom-crops', activeId], queryFn: () => fetchCustomCrops(activeId as string), enabled: !!activeId })
  const cropDef = useMemo(() => crops.find((c) => c.crop_code === batch.crop_type), [crops, batch.crop_type])

  const [reharvest, setReharvest] = useState<ReharvestChoice>('none')
  const [reharvestCustom, setReharvestCustom] = useState('')
  // Default the prompt from the crop's own interval the first time it loads
  // (once the crops list has actually arrived — don't stomp a choice the
  // user already made while it was still loading).
  useEffect(() => {
    if (cropDef?.reharvest_days == null) return
    setReharvest(cropDef.reharvest_days === 7 ? 7 : cropDef.reharvest_days === 14 ? 14 : 'custom')
    if (cropDef.reharvest_days !== 7 && cropDef.reharvest_days !== 14) setReharvestCustom(String(cropDef.reharvest_days))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropDef?.reharvest_days])

  const plantsNum = Number(plants) || 0
  const isCutHarvest = plantsNum === 0
  const reharvestDaysChosen = reharvest === 'none' ? null : reharvest === 'custom' ? Number(reharvestCustom) || null : reharvest

  const mutation = useMutation({
    mutationFn: () =>
      recordHarvest(activeId as string, {
        date,
        grow_bed_id: batch.grow_bed_id as number,
        crop_type: batch.crop_type,
        batch_id: batch.batch_id,
        plants_harvested: plantsNum,
        harvest_weight_kg: weight ? Number(weight) : undefined,
        quality,
        notes: notes.trim() || undefined,
        days_to_harvest: isCutHarvest && reharvestDaysChosen != null ? (batch.age_days ?? 0) + reharvestDaysChosen : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plant-batches'] })
      qc.invalidateQueries({ queryKey: ['plant-growth'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const p = plantsNum
    const w = Number(weight) || 0
    if (p <= 0 && w <= 0) return setError('Enter plants harvested and/or a weight.')
    if (p > batch.remaining) return setError(`Only ${batch.remaining} plants remaining in this batch.`)
    if (isCutHarvest && reharvest === 'custom' && !reharvestDaysChosen) return setError('Enter a number of days, or choose "Don\'t reset".')
    mutation.mutate()
  }

  return (
    <Modal title={`Harvest ${prettyCrop(batch.crop_type)}`} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <p style={{ margin: '0 0 4px', color: 'var(--ink-faint)', fontSize: 13 }}>
          {batch.remaining} plants remaining · {batch.bed_name ?? `Bed ${batch.bed_number ?? '—'}`}
        </p>

        <div className="field-row">
          <div className="field">
            <label htmlFor="hv-plants">Plants harvested</label>
            <input id="hv-plants" type="number" min="0" step="1" inputMode="numeric" autoFocus value={plants} onChange={(e) => setPlants(e.target.value)} placeholder={`0–${batch.remaining}`} />
          </div>
          <div className="field">
            <label htmlFor="hv-weight">Weight <span className="unit-hint">(kg) · optional</span></label>
            <input id="hv-weight" type="number" min="0" step="any" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 1.5" />
          </div>
        </div>
        <div className="unit-hint" style={{ marginTop: -4 }}>Leave plants at 0 for a fruit-only harvest (plants stay in the bed).</div>

        {isCutHarvest && (
          <div className="field">
            <label>Next harvest</label>
            <div className="hv-reharvest-chips">
              <button type="button" className={reharvest === 'none' ? 'on' : ''} onClick={() => setReharvest('none')}>Don't reset</button>
              <button type="button" className={reharvest === 7 ? 'on' : ''} onClick={() => setReharvest(7)}>In 1 week</button>
              <button type="button" className={reharvest === 14 ? 'on' : ''} onClick={() => setReharvest(14)}>In 2 weeks</button>
              <button type="button" className={reharvest === 'custom' ? 'on' : ''} onClick={() => setReharvest('custom')}>Custom</button>
            </div>
            {reharvest === 'custom' && (
              <input type="number" min="1" step="1" inputMode="numeric" style={{ marginTop: 8, maxWidth: 140 }} value={reharvestCustom} onChange={(e) => setReharvestCustom(e.target.value)} placeholder="Days" autoFocus />
            )}
            <p className="field-hint">
              {reharvest === 'none'
                ? "This pick won't change when the batch is next due."
                : `Pushes this batch's "ready to harvest" date out by the chosen interval — the plants stay in the bed.`}
            </p>
          </div>
        )}

        <div className="field-row">
          <div className="field">
            <label htmlFor="hv-date">Date</label>
            <input id="hv-date" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="hv-quality">Quality</label>
            <select id="hv-quality" value={quality} onChange={(e) => setQuality(e.target.value)}>
              {QUALITIES.map((q) => (
                <option key={q} value={q}>{q.charAt(0).toUpperCase() + q.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="hv-notes">Notes <span className="unit-hint">· optional</span></label>
          <input id="hv-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Record harvest'}</button>
        </div>
      </form>
    </Modal>
  )
}
