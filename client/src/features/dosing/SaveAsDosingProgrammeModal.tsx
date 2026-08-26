import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { KEYS, mixGroupOf, MIX_LABEL, groupsClash, recommendWeekly, MAX_WEEKLY_PPM, type Levels, type Product, type MixGroup } from '../calculator/nutrientDosing'
import { createDosingProgramme, nutrientShort, WEEKDAYS, WEEKDAY_LABEL, MAX_PH_STEP } from './api'
import '../spray/spray.css'
import './dosing.css'

const DEFAULT_GROUP_DAYS: Record<MixGroup, string[]> = { A: ['mon'], B: ['thu'], C: ['sat'] }

// Turn the calculator's crop targets + fertilisers into a dosing programme: one
// target per nutrient (target>0), each auto-assigned the fertiliser richest in
// that nutrient, with the recommended dose amount and clash-aware days (calcium
// and phosphate mixes on different days). The user reviews and confirms.
export type PhBuffer = { product: string; unit: string; total_amount: number; current_ph: number; target_ph: number; direction: 'up' | 'down' }

export function SaveAsDosingProgrammeModal({ systemId, cropName, target, current, volumeL, caps, products, phBuffer, targeted, onClose }: {
  systemId: string
  cropName: string
  target: Levels
  current: Levels
  volumeL: number
  caps?: Levels
  products: Product[]
  phBuffer?: PhBuffer | null
  targeted?: Set<string>
  onClose: () => void
}) {
  const qc = useQueryClient()
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  const [name, setName] = useState(`${cropName} maintenance`)
  const [startDate, setStartDate] = useState(todayISO())
  // Finite by default: spread each correction over the weeks needed to reach
  // target safely, then stop. Off = repeat the weekly dose indefinitely.
  const [finite, setFinite] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const capOf = (k: keyof Levels) => (caps ?? MAX_WEEKLY_PPM)[k]

  const rows = useMemo(() =>
    KEYS.filter((k) => (targeted ? targeted.has(k) : true) && target[k] > 0).map((k) => {
      const best = products.reduce<Product | null>((b, p) => (p[k] > (b?.[k] ?? 0) ? p : b), null)
      const pct = best ? best[k] : 0
      const rec = best && pct > 0 ? recommendWeekly(target[k], current[k] ?? 0, volumeL, pct, capOf(k)) : { weekly: null, weeks: 0 }
      const group: MixGroup = best ? mixGroupOf(best) : 'C'
      return { nutrient: k, target_value: Math.round(target[k] * 10) / 10, product: best && pct > 0 ? best.name : null, amount: rec.weekly, weeks: rec.weeks, group }
    }), [target, current, volumeL, products, caps, targeted])

  const usedGroups = useMemo(() => (['A', 'B', 'C'] as MixGroup[]).filter((g) => rows.some((r) => r.group === g && r.product)), [rows])
  const maxWeeks = useMemo(() => Math.max(1, ...rows.filter((r) => r.product).map((r) => r.weeks || 1)), [rows])
  const [groupDays, setGroupDays] = useState<Record<MixGroup, string[]>>({ ...DEFAULT_GROUP_DAYS })
  const toggleGroupDay = (g: MixGroup, d: string) => setGroupDays((s) => ({ ...s, [g]: s[g].includes(d) ? s[g].filter((x) => x !== d) : [...s[g], d] }))
  const clashDay = useMemo(() => {
    for (const a of usedGroups) for (const b of usedGroups) if (a < b && groupsClash(a, b) && groupDays[a].some((d) => groupDays[b].includes(d))) return true
    return false
  }, [usedGroups, groupDays])

  // pH is adjusted first and never by more than MAX_PH_STEP per dose — a bigger
  // gap spreads over that many doses. It leads on the earliest day anything is dosed.
  const phPlan = useMemo(() => {
    if (!phBuffer) return null
    const gap = Math.abs(phBuffer.current_ph - phBuffer.target_ph)
    const doses = Math.max(1, Math.ceil(gap / MAX_PH_STEP))
    return { doses, perDose: Math.round((phBuffer.total_amount / doses) * 10) / 10, gap: Math.round(gap * 100) / 100 }
  }, [phBuffer])
  const phDay = useMemo(() => { const used = new Set(usedGroups.flatMap((g) => groupDays[g])); return WEEKDAYS.find((d) => used.has(d)) ?? 'mon' }, [usedGroups, groupDays])

  const mut = useMutation({
    mutationFn: () => createDosingProgramme(systemId, {
      name: name.trim(),
      start_date: startDate || null,
      targets: [
        // pH first, so the schedule leads with the pH adjustment.
        ...(phBuffer && phPlan
          ? [{ nutrient: 'ph', target_value: phBuffer.target_ph, product: phBuffer.product, dose_amount: phPlan.perDose, dose_unit: phBuffer.unit, doses: finite ? phPlan.doses : null, days: [phDay] }]
          : []),
        ...rows.filter((r) => r.product).map((r) => ({ nutrient: r.nutrient, target_value: r.target_value, product: r.product, dose_amount: r.amount, dose_unit: 'g', doses: finite ? Math.max(1, r.weeks || 1) : null, days: groupDays[r.group] })),
      ],
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dosing-programmes'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not create the programme.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Give the programme a name.')
    if (rows.filter((r) => r.product).length === 0 && !(phBuffer && phPlan)) return setError('No positive targets to save.')
    if (usedGroups.some((g) => groupDays[g].length === 0)) return setError('Give each mix its test/dose days.')
    if (clashDay) return setError('Calcium and phosphate mixes clash — give them different days.')
    mut.mutate()
  }

  return (
    <Modal title="Save as dosing programme" onClose={onClose} wide>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field-row">
          <div className="field">
            <label htmlFor="sdp-name">Programme name</label>
            <input id="sdp-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="sdp-start">Start date</label>
            <input id="sdp-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>

        <div className="dz-label">Targets <span className="unit-hint">· recommended doses{volumeL > 0 ? ` for ${volumeL.toLocaleString()} L` : ''} — confirm below</span></div>
        <div className="dp-tcards">
          {phBuffer && phPlan && (
            <div className="dp-tcard dp-ph-first">
              <div className="dp-tdose" style={{ paddingLeft: 0 }}>
                <span className="dp-cp-target">pH → {phBuffer.target_ph} <span className="dp-ph-badge">do first</span></span>
                <span className="dp-cp-fert">{phBuffer.product}</span>
                <span className="dp-dose-lbl">dose <b style={{ color: 'var(--ink)' }}>{phPlan.perDose} {phBuffer.unit}</b>
                  {phPlan.doses > 1 ? ` · over ${phPlan.doses} doses (≤${MAX_PH_STEP} pH each)` : ` · ${phBuffer.direction === 'up' ? 'raise' : 'lower'} pH`}</span>
              </div>
            </div>
          )}
          {rows.map((r) => (
            <div key={r.nutrient} className="dp-tcard">
              <div className="dp-tdose" style={{ paddingLeft: 0 }}>
                <span className="dp-cp-target">{nutrientShort(r.nutrient)} → {r.target_value} ppm</span>
                <span className="dp-cp-fert">{r.product ?? 'no fertiliser'}</span>
                {r.amount != null && <span className="dp-dose-lbl">dose <b style={{ color: 'var(--ink)' }}>{r.amount} g/week</b>{r.weeks > 1 ? ` · ~${r.weeks} wks to target` : ''}</span>}
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

        <label className="dp-finite">
          <input type="checkbox" checked={finite} onChange={(e) => setFinite(e.target.checked)} />
          <span>
            <b>Spread to target, then stop</b>
            <span className="dz-hint" style={{ display: 'block' }}>
              {finite
                ? `Each nutrient doses its weekly amount until it reaches target${maxWeeks > 1 ? ` (up to ${maxWeeks} week${maxWeeks === 1 ? '' : 's'})` : ''}, then the schedule ends — no perpetual over-dosing.`
                : 'The weekly dose repeats indefinitely (ongoing maintenance).'}
            </span>
          </span>
        </label>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending || (rows.filter((r) => r.product).length === 0 && !(phBuffer && phPlan))}>{mut.isPending ? 'Saving…' : 'Create programme'}</button>
        </div>
      </form>
    </Modal>
  )
}
