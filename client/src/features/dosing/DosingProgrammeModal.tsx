import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { fetchFishInventory } from '../fish/api'
import { fetchGrowBedConfigs } from '../growbeds/api'
import { DEFAULT_PRODUCTS, mixGroupOf, MIX_LABEL, groupsClash, recommendWeekly, MAX_WEEKLY_PPM, type MixGroup } from '../calculator/nutrientDosing'
import {
  fetchFertilisers,
  fetchLatestReadings,
  NUTRIENT_READKEY,
  createDosingProgramme,
  updateDosingProgramme,
  NUTRIENT_OPTS,
  WEEKDAYS,
  WEEKDAY_LABEL,
  type DosingProgramme,
  type NutrientKey,
  type Fertiliser,
} from './api'
import { AddFertiliserModal } from './AddFertiliserModal'
import '../spray/spray.css'
import './dosing.css'

type Row = { nutrient: NutrientKey; target_value: string; product: string; unit: string }
const DOSE_UNITS = ['g', 'kg', 'ml', 'L']
// Default, non-overlapping cadence per mix group (auto-split so clashing
// fertilisers never share a day).
const DEFAULT_GROUP_DAYS: Record<MixGroup, string[]> = { A: ['mon'], B: ['thu'], C: ['sat'] }

export function DosingProgrammeModal({ systemId, programme, onClose }: { systemId: string; programme?: DosingProgramme; onClose: () => void }) {
  const qc = useQueryClient()
  const editing = !!programme
  const { data: ferts = [] } = useQuery({ queryKey: ['dosing-fertilisers'], queryFn: fetchFertilisers })
  const { data: latest } = useQuery({ queryKey: ['nutrients-latest', systemId], queryFn: () => fetchLatestReadings(systemId) })
  const { data: tanks = [] } = useQuery({ queryKey: ['fish-inventory', systemId], queryFn: () => fetchFishInventory(systemId) })
  const { data: beds = [] } = useQuery({ queryKey: ['grow-bed-configs', systemId], queryFn: () => fetchGrowBedConfigs(systemId) })

  const productList: Fertiliser[] = useMemo(() => (ferts.length ? ferts : (DEFAULT_PRODUCTS as unknown as Fertiliser[])), [ferts])
  const byName = useMemo(() => new Map(productList.map((p) => [p.name, p])), [productList])
  const volumeL = useMemo(() => {
    const tankL = tanks.reduce((s, t) => s + (t.size_m3 && t.size_m3 > 0 ? t.size_m3 * 1000 : t.volume_liters ?? 0), 0)
    const bedL = beds.reduce((s, b) => s + (b.volume_liters ?? 0), 0)
    return Math.round(tankL + bedL)
  }, [tanks, beds])

  const [name, setName] = useState(programme?.name ?? '')
  const [notes, setNotes] = useState(programme?.notes ?? '')
  const [rows, setRows] = useState<Row[]>(
    programme?.targets?.length
      ? programme.targets.map((t) => ({ nutrient: t.nutrient, target_value: t.target_value != null ? String(t.target_value) : '', product: t.product ?? '', unit: t.dose_unit ?? 'g' }))
      : [{ nutrient: 'n', target_value: '', product: '', unit: 'g' }],
  )
  // Per-row manual dose override (else the recommendation is shown).
  const [amtOverride, setAmtOverride] = useState<Record<number, string>>(
    () => Object.fromEntries((programme?.targets ?? []).map((t, i) => [i, t.dose_amount != null ? String(t.dose_amount) : ''] as const).filter(([, v]) => v !== '')),
  )
  const [groupDays, setGroupDays] = useState<Record<MixGroup, string[]>>({ ...DEFAULT_GROUP_DAYS })
  const [addingFert, setAddingFert] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const groupOf = (productName: string): MixGroup | null => { const p = byName.get(productName); return p ? mixGroupOf(p) : null }

  // When editing, once the fertilisers load, seed each mix group's days from the
  // existing targets (runs once).
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !editing || productList.length === 0) return
    seeded.current = true
    const g = { ...DEFAULT_GROUP_DAYS }
    for (const t of programme?.targets ?? []) {
      const grp = t.product ? mixGroupOf(byName.get(t.product) ?? {}) : null
      if (grp && t.days.length) g[grp] = t.days
    }
    setGroupDays(g)
  }, [editing, productList, programme, byName])
  // Recommended per-week dose (large corrections spread over weeks to stay within
  // the nutrient's safe weekly rise).
  const recommendedFor = (r: Row): number | null => {
    const p = byName.get(r.product)
    if (!p) return null
    const pct = (p as unknown as Record<string, number>)[r.nutrient] || 0
    const cur = latest?.[NUTRIENT_READKEY[r.nutrient]] ?? 0
    return recommendWeekly(Number(r.target_value) || 0, cur, volumeL, pct, MAX_WEEKLY_PPM[r.nutrient]).weekly
  }
  const weeksFor = (r: Row): number => {
    const p = byName.get(r.product)
    if (!p) return 0
    const pct = (p as unknown as Record<string, number>)[r.nutrient] || 0
    const cur = latest?.[NUTRIENT_READKEY[r.nutrient]] ?? 0
    return recommendWeekly(Number(r.target_value) || 0, cur, volumeL, pct, MAX_WEEKLY_PPM[r.nutrient]).weeks
  }
  const doseValue = (i: number, r: Row): string => (amtOverride[i] !== undefined ? amtOverride[i] : (recommendedFor(r) != null ? String(recommendedFor(r)) : ''))

  const setRow = (i: number, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
    if ('nutrient' in patch || 'target_value' in patch || 'product' in patch) setAmtOverride((o) => { const n = { ...o }; delete n[i]; return n })
  }
  const addRow = () => setRows((rs) => [...rs, { nutrient: 'n', target_value: '', product: '', unit: 'g' }])
  const removeRow = (i: number) => { setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs)); setAmtOverride((o) => { const n = { ...o }; delete n[i]; return n }) }
  const toggleGroupDay = (g: MixGroup, d: string) => setGroupDays((s) => ({ ...s, [g]: s[g].includes(d) ? s[g].filter((x) => x !== d) : [...s[g], d] }))

  // Which mix groups are actually used, and any same-day clash between them.
  const usedGroups = useMemo(() => {
    const set = new Set<MixGroup>()
    for (const r of rows) { const g = groupOf(r.product); if (g) set.add(g) }
    return (['A', 'B', 'C'] as MixGroup[]).filter((g) => set.has(g))
  }, [rows, byName])
  const clashDay = useMemo(() => {
    for (const a of usedGroups) for (const b of usedGroups) {
      if (a < b && groupsClash(a, b) && groupDays[a].some((d) => groupDays[b].includes(d))) return true
    }
    return false
  }, [usedGroups, groupDays])

  const mut = useMutation({
    mutationFn: () => {
      const targets = rows.filter((r) => r.target_value.trim() !== '' && r.product).map((r, i) => {
        const g = groupOf(r.product) ?? 'C'
        const ri = rows.indexOf(r)
        const amt = doseValue(ri, r)
        void i
        // Finite: dose until target is reached (weeks-to-target), then stop.
        const doses = amt.trim() !== '' && Number(amt) > 0 ? Math.max(1, weeksFor(r)) : null
        return { nutrient: r.nutrient, target_value: Number(r.target_value), product: r.product, dose_amount: amt.trim() === '' ? null : Number(amt), dose_unit: r.unit, doses, days: groupDays[g] }
      })
      const input = { name: name.trim(), notes: notes.trim() || null, targets }
      return editing ? updateDosingProgramme(programme!.id, input) : createDosingProgramme(systemId, input)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dosing-programmes'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Give the programme a name.')
    const filled = rows.filter((r) => r.target_value.trim() !== '')
    if (filled.length === 0) return setError('Set at least one target value.')
    if (filled.some((r) => !r.product)) return setError('Pick a fertiliser for every target.')
    if (usedGroups.some((g) => groupDays[g].length === 0)) return setError('Give each mix its test/dose days.')
    if (clashDay) return setError('Calcium and phosphate mixes clash — give them different days.')
    mut.mutate()
  }

  return (
    <Modal title={editing ? `Edit ${programme?.name}` : 'New dosing programme'} onClose={onClose} wide>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field">
          <label htmlFor="dp-name">Programme name</label>
          <input id="dp-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nitrogen maintenance" autoFocus />
        </div>

        <div className="dz-label">Targets to hold <span className="unit-hint">{volumeL > 0 ? `· reservoir ${volumeL.toLocaleString()} L` : ''}</span></div>
        <div className="dp-tcards">
          {rows.map((r, i) => {
            const g = groupOf(r.product)
            const rec = recommendedFor(r)
            const wk = weeksFor(r)
            return (
              <div className="dp-tcard" key={i}>
                <div className="dp-trow">
                  <select value={r.nutrient} onChange={(e) => setRow(i, { nutrient: e.target.value as NutrientKey })} aria-label="Nutrient">
                    {NUTRIENT_OPTS.map((o) => <option key={o.key} value={o.key}>{o.short}</option>)}
                  </select>
                  <input type="number" min="0" step="any" inputMode="decimal" placeholder="target ppm" value={r.target_value} onChange={(e) => setRow(i, { target_value: e.target.value })} />
                  <select value={r.product} onChange={(e) => { if (e.target.value === '__add__') setAddingFert(i); else setRow(i, { product: e.target.value }) }} aria-label="Fertiliser">
                    <option value="">Select fertiliser…</option>
                    {productList.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                    <option value="__add__">＋ Add new fertiliser…</option>
                  </select>
                  <button type="button" className="dz-x" onClick={() => removeRow(i)} disabled={rows.length === 1} aria-label="Remove">×</button>
                </div>
                <div className="dp-tdose">
                  <span className="dp-dose-lbl">Dose <span className="unit-hint">/week</span></span>
                  <input className="dp-dose-amt" type="number" min="0" step="any" inputMode="decimal" placeholder={rec != null ? String(rec) : 'amount'} value={doseValue(i, r)} onChange={(e) => setAmtOverride((o) => ({ ...o, [i]: e.target.value }))} />
                  <select className="dp-dose-unit" value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} aria-label="Dose unit">
                    {DOSE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {wk > 1 && <span className="dp-dose-weeks">~{wk} wks to target</span>}
                  {rec != null && amtOverride[i] !== undefined && Number(amtOverride[i]) !== rec && <span className="dp-dose-rec">rec {rec} g</span>}
                  {g && <span className={`dp-mix mix-${g}`}>{MIX_LABEL[g]}</span>}
                </div>
              </div>
            )
          })}
          <button type="button" className="link-btn" onClick={addRow}>+ Add target</button>
        </div>

        <div className="dz-label">Schedule <span className="unit-hint">· clashing mixes get different days</span></div>
        <div className="dp-schedule">
          {usedGroups.length === 0 ? (
            <div className="dz-hint">Pick a fertiliser above to set its schedule.</div>
          ) : usedGroups.map((g) => (
            <div className="dp-sched-row" key={g}>
              <span className={`dp-mix mix-${g}`}>{MIX_LABEL[g]}</span>
              <div className="pm-days">
                {WEEKDAYS.map((d) => <button key={d} type="button" className={groupDays[g].includes(d) ? 'on' : ''} onClick={() => toggleGroupDay(g, d)}>{WEEKDAY_LABEL[d]}</button>)}
              </div>
            </div>
          ))}
          {clashDay && <div className="wq-error" style={{ marginTop: 8 }}>Calcium and phosphate/potassium mixes can't be dosed the same day — give them different days.</div>}
        </div>

        <div className="field">
          <label htmlFor="dp-notes">Notes</label>
          <textarea id="dp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : editing ? 'Save programme' : 'Create programme'}</button>
        </div>
      </form>

      {addingFert != null && (
        <AddFertiliserModal onClose={() => setAddingFert(null)} onAdded={(nm) => { setRow(addingFert, { product: nm }); }} />
      )}
    </Modal>
  )
}
