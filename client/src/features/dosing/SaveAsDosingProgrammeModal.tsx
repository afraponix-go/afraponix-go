import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { KEYS, mixGroupOf, MIX_LABEL, groupsClash, recommendDose, type Levels, type Product, type MixGroup } from '../calculator/nutrientDosing'
import { createDosingProgramme, nutrientShort, WEEKDAYS, WEEKDAY_LABEL } from './api'
import '../spray/spray.css'
import './dosing.css'

const DEFAULT_GROUP_DAYS: Record<MixGroup, string[]> = { A: ['mon'], B: ['thu'], C: ['sat'] }

// Turn the calculator's crop targets + fertilisers into a dosing programme: one
// target per nutrient (target>0), each auto-assigned the fertiliser richest in
// that nutrient, with the recommended dose amount and clash-aware days (calcium
// and phosphate mixes on different days). The user reviews and confirms.
export function SaveAsDosingProgrammeModal({ systemId, cropName, target, current, volumeL, products, onClose }: {
  systemId: string
  cropName: string
  target: Levels
  current: Levels
  volumeL: number
  products: Product[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(`${cropName} maintenance`)
  const [error, setError] = useState<string | null>(null)

  const rows = useMemo(() =>
    KEYS.filter((k) => target[k] > 0).map((k) => {
      const best = products.reduce<Product | null>((b, p) => (p[k] > (b?.[k] ?? 0) ? p : b), null)
      const pct = best ? best[k] : 0
      const amount = best && pct > 0 ? recommendDose(target[k], current[k] ?? 0, volumeL, pct) : null
      const group: MixGroup = best ? mixGroupOf(best) : 'C'
      return { nutrient: k, target_value: Math.round(target[k] * 10) / 10, product: best && pct > 0 ? best.name : null, amount, group }
    }), [target, current, volumeL, products])

  const usedGroups = useMemo(() => (['A', 'B', 'C'] as MixGroup[]).filter((g) => rows.some((r) => r.group === g && r.product)), [rows])
  const [groupDays, setGroupDays] = useState<Record<MixGroup, string[]>>({ ...DEFAULT_GROUP_DAYS })
  const toggleGroupDay = (g: MixGroup, d: string) => setGroupDays((s) => ({ ...s, [g]: s[g].includes(d) ? s[g].filter((x) => x !== d) : [...s[g], d] }))
  const clashDay = useMemo(() => {
    for (const a of usedGroups) for (const b of usedGroups) if (a < b && groupsClash(a, b) && groupDays[a].some((d) => groupDays[b].includes(d))) return true
    return false
  }, [usedGroups, groupDays])

  const mut = useMutation({
    mutationFn: () => createDosingProgramme(systemId, {
      name: name.trim(),
      targets: rows.filter((r) => r.product).map((r) => ({ nutrient: r.nutrient, target_value: r.target_value, product: r.product, dose_amount: r.amount, dose_unit: 'g', days: groupDays[r.group] })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dosing-programmes'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not create the programme.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Give the programme a name.')
    if (rows.filter((r) => r.product).length === 0) return setError('No positive targets to save.')
    if (usedGroups.some((g) => groupDays[g].length === 0)) return setError('Give each mix its test/dose days.')
    if (clashDay) return setError('Calcium and phosphate mixes clash — give them different days.')
    mut.mutate()
  }

  return (
    <Modal title="Save as dosing programme" onClose={onClose} wide>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field">
          <label htmlFor="sdp-name">Programme name</label>
          <input id="sdp-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        <div className="dz-label">Targets <span className="unit-hint">· recommended doses{volumeL > 0 ? ` for ${volumeL.toLocaleString()} L` : ''} — confirm below</span></div>
        <div className="dp-tcards">
          {rows.map((r) => (
            <div key={r.nutrient} className="dp-tcard">
              <div className="dp-tdose" style={{ paddingLeft: 0 }}>
                <span className="dp-cp-target">{nutrientShort(r.nutrient)} → {r.target_value} ppm</span>
                <span className="dp-cp-fert">{r.product ?? 'no fertiliser'}</span>
                {r.amount != null && <span className="dp-dose-lbl">dose <b style={{ color: 'var(--ink)' }}>{r.amount} g</b></span>}
                {r.product && <span className={`dp-mix mix-${r.group}`}>{MIX_LABEL[r.group]}</span>}
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="dz-hint">No positive targets — pick a crop with targets first.</div>}
        </div>

        <div className="dz-label">Schedule <span className="unit-hint">· clashing mixes get different days</span></div>
        <div className="dp-schedule">
          {usedGroups.map((g) => (
            <div className="dp-sched-row" key={g}>
              <span className={`dp-mix mix-${g}`}>{MIX_LABEL[g]}</span>
              <div className="pm-days">
                {WEEKDAYS.map((d) => <button key={d} type="button" className={groupDays[g].includes(d) ? 'on' : ''} onClick={() => toggleGroupDay(g, d)}>{WEEKDAY_LABEL[d]}</button>)}
              </div>
            </div>
          ))}
          {clashDay && <div className="wq-error" style={{ marginTop: 8 }}>Calcium and phosphate/potassium mixes can't be dosed the same day — give them different days.</div>}
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending || rows.filter((r) => r.product).length === 0}>{mut.isPending ? 'Saving…' : 'Create programme'}</button>
        </div>
      </form>
    </Modal>
  )
}
