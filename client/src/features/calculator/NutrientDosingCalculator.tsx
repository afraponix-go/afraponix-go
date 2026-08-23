import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory } from '../fish/api'
import { fetchGrowBedConfigs } from '../growbeds/api'
import {
  DEFAULT_PRODUCTS,
  NUTRIENTS,
  KEYS,
  computeDose,
  emptyLevels,
  fetchLatestLevels,
  fetchUserProducts,
  mixSchedule,
  MAX_WEEKLY_PPM,
  weeksToReach,
  type Levels,
  type NutrientKey,
  type Product,
} from './nutrientDosing'
import { fetchDosingCrops } from './cropData'
import { fetchCropTargets, type Stage } from '../plants/cropTargets'
import { SaveAsDosingProgrammeModal } from '../dosing/SaveAsDosingProgrammeModal'
import '../dashboard/dashboard.css'
import './calculator.css'

const numOr0 = (v: string) => (v === '' ? 0 : Number(v) || 0)
const fmt = (n: number, d = 1) => (n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(d))

export function NutrientDosingCalculator() {
  const { activeId } = useSystems()
  const [cropCode, setCropCode] = useState('')
  const [stage, setStage] = useState<Stage>('vegetative')
  const [volume, setVolume] = useState('')
  const [startingEC, setStartingEC] = useState('')

  const [target, setTarget] = useState<Levels>(emptyLevels)
  const [targetTouched, setTargetTouched] = useState(false)
  const [saveProg, setSaveProg] = useState(false)
  const [caps, setCaps] = useState<Levels>({ ...MAX_WEEKLY_PPM })
  const [current, setCurrent] = useState<Levels>(emptyLevels)
  const [currentTouched, setCurrentTouched] = useState(false)

  // Fertilisers come from the catalogue (Operations → Catalogue). Here the user
  // just ticks which of them to dose with; `deselected` tracks the unticked ones
  // (so new catalogue fertilisers are used by default).
  const productsQ = useQuery({ queryKey: ['dosing-products'], queryFn: fetchUserProducts })
  const catalogue = useMemo<Product[]>(() => productsQ.data ?? DEFAULT_PRODUCTS, [productsQ.data])
  const [deselected, setDeselected] = useState<Set<string>>(new Set())
  const toggleFert = (name: string) => setDeselected((s) => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n })
  const products = useMemo(() => catalogue.filter((p) => !deselected.has(p.name)), [catalogue, deselected])

  // Crops come from the user's own list; the ones planted in this system are
  // flagged so the picker can offer them first.
  const cropsQ = useQuery({ queryKey: ['dosing-crops', activeId], queryFn: () => fetchDosingCrops(activeId as string), enabled: !!activeId })
  const crops = cropsQ.data ?? []
  const inSystemCrops = useMemo(() => crops.filter((c) => c.inSystem), [crops])
  const otherCrops = useMemo(() => crops.filter((c) => !c.inSystem), [crops])
  const selectedCrop = useMemo(() => crops.find((c) => c.code === cropCode), [crops, cropCode])

  // Effective targets for this system + crop + stage, resolving a per-system
  // override over the global default (server-side). `stages` reports whether the
  // crop carries a fruiting stage (which shows the toggle).
  const targetsQ = useQuery({
    queryKey: ['crop-targets', activeId, cropCode, stage],
    queryFn: () => fetchCropTargets(activeId as string, cropCode, stage),
    enabled: !!activeId && !!cropCode,
  })
  const isFruiting = !!targetsQ.data?.stages?.includes('fruiting')
  const targetSource = targetsQ.data?.source
  const eff = targetsQ.data?.effective ?? null
  // Memoized so the reference is stable across renders — otherwise the
  // target-prefill effect below (which depends on it) re-fires every render and
  // loops "Maximum update depth exceeded", freezing the whole app.
  const resolvedTargets = useMemo<Levels | null>(
    () => (eff ? { n: eff.n ?? 0, p: eff.p ?? 0, k: eff.k ?? 0, ca: eff.ca ?? 0, mg: eff.mg ?? 0, fe: eff.fe ?? 0 } : null),
    [eff],
  )
  const targetsLoading = !!cropCode && targetsQ.isLoading
  const noSavedTargets = !!selectedCrop && !targetsQ.isLoading && targetSource === 'none'

  const latestQ = useQuery({ queryKey: ['nutrients-latest', activeId], queryFn: () => fetchLatestLevels(activeId as string), enabled: !!activeId })
  const tanksQ = useQuery({ queryKey: ['fish-inventory', activeId], queryFn: () => fetchFishInventory(activeId as string), enabled: !!activeId })
  const bedsQ = useQuery({ queryKey: ['grow-bed-configs', activeId], queryFn: () => fetchGrowBedConfigs(activeId as string), enabled: !!activeId })

  // Reset the crop selection when the active system changes; the effect below
  // then defaults to the first crop of the new system.
  useEffect(() => { setCropCode(''); setTargetTouched(false) }, [activeId])
  useEffect(() => {
    if (!cropCode && crops.length) setCropCode(crops[0].code)
  }, [crops, cropCode])

  // Targets follow the selected crop + stage (still editable after). Reset to
  // the vegetative stage and clear the "touched" guard on a crop change; clear
  // it again on a stage change so the new stage's targets load.
  useEffect(() => { setStage('vegetative'); setTargetTouched(false) }, [cropCode])
  useEffect(() => { setTargetTouched(false) }, [stage])
  useEffect(() => {
    if (targetTouched) return
    setTarget(resolvedTargets ?? emptyLevels())
  }, [resolvedTargets, targetTouched, cropCode, stage])

  // Current levels pre-fill from the latest readings, until edited.
  useEffect(() => {
    if (currentTouched || !latestQ.data) return
    const next = emptyLevels()
    for (const n of NUTRIENTS) {
      const v = latestQ.data[n.readKey]
      if (v != null) next[n.key] = v
    }
    setCurrent(next)
  }, [latestQ.data, currentTouched])

  // Reservoir volume from tanks + grow beds, until edited.
  const systemVolume = useMemo(() => {
    const tankL = (tanksQ.data ?? []).reduce((s, t) => s + (t.size_m3 && t.size_m3 > 0 ? t.size_m3 * 1000 : t.volume_liters ?? 0), 0)
    const bedL = (bedsQ.data ?? []).reduce((s, b) => s + (b.volume_liters ?? 0), 0)
    return Math.round(tankL + bedL)
  }, [tanksQ.data, bedsQ.data])
  const [volumeTouched, setVolumeTouched] = useState(false)
  useEffect(() => setVolumeTouched(false), [activeId])
  useEffect(() => {
    if (!volumeTouched && systemVolume > 0) setVolume(String(systemVolume))
  }, [systemVolume, volumeTouched])

  const volumeL = Number(volume) > 0 ? Number(volume) : 0
  const result = useMemo(() => computeDose(volumeL, current, target, products), [volumeL, current, target, products])
  const targetsEmpty = KEYS.every((k) => !(target[k] > 0))
  // EC is a poor proxy for nutrition in aquaponics and is not derived from the
  // targets — show the crop's hydroponic-derived EC guide band for reference.
  const ecGuide = selectedCrop && selectedCrop.ecMin != null && selectedCrop.ecMax != null
    ? `${selectedCrop.ecMin}–${selectedCrop.ecMax}`
    : selectedCrop && selectedCrop.ecMin != null ? String(selectedCrop.ecMin) : null

  const setCur = (k: NutrientKey, v: string) => { setCurrent((c) => ({ ...c, [k]: numOr0(v) })); setCurrentTouched(true) }
  const setTgt = (k: NutrientKey, v: string) => { setTarget((t) => ({ ...t, [k]: numOr0(v) })); setTargetTouched(true) }

  const mixes = useMemo(() => mixSchedule(result.doses, products), [result.doses, products])
  // Spread the correction over enough weeks that no nutrient rises faster than
  // its safe weekly cap. The per-week dose is the total ÷ weeks.
  const weeks = useMemo(() => weeksToReach(target, current, caps), [target, current, caps])
  const setCap = (k: NutrientKey, v: string) => setCaps((c) => ({ ...c, [k]: numOr0(v) }))

  const cropName = selectedCrop ? `${selectedCrop.name}${isFruiting ? ` (${stage})` : ''}` : 'this crop'

  return (
    <div>
      <div className="dash-head">
        <div>
          <h1 style={{ margin: 0 }}>Nutrient Dosing</h1>
          <div className="dash-sub">Dose your reservoir to a crop's target levels</div>
        </div>
        {activeId && !targetsEmpty && (
          <button type="button" className="io-btn primary" onClick={() => setSaveProg(true)}>Save as dosing programme</button>
        )}
      </div>

      <div className="calc-layout">
        <form className="calc-form" onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label htmlFor="nd-vol">Reservoir volume <span className="hint">(litres)</span></label>
            <input id="nd-vol" type="number" min="0" step="10" inputMode="decimal" value={volume} onChange={(e) => { setVolume(e.target.value); setVolumeTouched(true) }} placeholder="e.g. 2000" />
            {systemVolume > 0 && (
              <span className="hint nd-vol-hint">
                {volumeTouched && Number(volume) !== systemVolume ? (
                  <button type="button" className="nd-vol-reset" onClick={() => { setVolume(String(systemVolume)); setVolumeTouched(false) }}>↺ Use system volume ({systemVolume.toLocaleString()} L)</button>
                ) : (
                  <>From your tanks + grow beds ({systemVolume.toLocaleString()} L)</>
                )}
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="nd-crop">Crop</label>
            <select id="nd-crop" value={cropCode} onChange={(e) => setCropCode(e.target.value)} disabled={!activeId || crops.length === 0}>
              {crops.length === 0 && <option value="">{cropsQ.isLoading ? 'Loading crops…' : 'No crops — add one on the Crops page'}</option>}
              {inSystemCrops.length > 0 && (
                <optgroup label="In your system">
                  {inSystemCrops.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </optgroup>
              )}
              {otherCrops.length > 0 && (
                <optgroup label={inSystemCrops.length > 0 ? 'Other crops' : 'Crops'}>
                  {otherCrops.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </optgroup>
              )}
            </select>
            {selectedCrop && (
              <span className="hint nd-vol-hint">
                {selectedCrop.inSystem ? 'Planted in this system' : 'Not currently in this system'}
                {targetSource === 'system' ? ' · your system override' : targetSource === 'default' ? ' · recommended targets' : ''}
              </span>
            )}
          </div>

          {isFruiting && (
            <div className="field">
              <label>Growth stage</label>
              <div className="nd-stage" role="group" aria-label="Growth stage">
                <button type="button" className={stage === 'vegetative' ? 'active' : ''} onClick={() => setStage('vegetative')}>Vegetative</button>
                <button type="button" className={stage === 'fruiting' ? 'active' : ''} onClick={() => setStage('fruiting')}>Fruiting</button>
              </div>
              <span className="hint nd-vol-hint">Fruiting crop — targets shift to higher K &amp; Ca once fruit sets.</span>
            </div>
          )}

          <div className="io-row">
            <div className="field">
              <label htmlFor="nd-ec0">Your EC <span className="hint">(mS/cm)</span></label>
              <input id="nd-ec0" type="number" min="0" step="0.1" inputMode="decimal" value={startingEC} onChange={(e) => setStartingEC(e.target.value)} placeholder="measured EC" />
            </div>
            <div className="field">
              <label htmlFor="nd-ec1">EC guide <span className="hint">(mS/cm)</span></label>
              <input id="nd-ec1" type="text" value={ecGuide ?? '—'} readOnly tabIndex={-1} />
            </div>
          </div>
          <p className="calc-result-hint" style={{ marginTop: 0 }}>EC is a rough guide only in aquaponics — dose to the nutrient targets below, not to EC.</p>

          <hr className="calc-divider" />
          <div className="calc-sub">Levels (ppm)</div>
          <p className="calc-result-hint" style={{ marginTop: 0 }}>
            {targetsLoading
              ? 'Loading recommended targets…'
              : noSavedTargets
                ? `No recommended targets are saved for ${cropName} yet — enter them below, or add them on the Crops page.`
                : activeId
                  ? 'Current pre-filled from your latest readings; targets from the crop — edit any value.'
                  : 'Enter current levels; targets come from the selected crop.'}
          </p>
          <div className="nd-levels">
            <div className="nd-lv-head"><span></span><span>Current</span><span>Target</span></div>
            {NUTRIENTS.map((n) => (
              <div className="nd-lv-row" key={n.key}>
                <label>{n.label}</label>
                <input type="number" min="0" step="0.1" inputMode="decimal" value={current[n.key] || ''} onChange={(e) => setCur(n.key, e.target.value)} placeholder="0" />
                <input type="number" min="0" step="0.1" inputMode="decimal" value={target[n.key] || ''} onChange={(e) => setTgt(n.key, e.target.value)} placeholder="0" />
              </div>
            ))}
          </div>

          <hr className="calc-divider" />
          <div className="calc-sub nd-fert-head">
            Fertilisers
            <Link className="nd-fert-manage" to="/operations/catalog">Manage in Catalogue ›</Link>
          </div>
          <p className="calc-result-hint" style={{ marginTop: 0 }}>Tick the fertilisers to dose with. Add or edit them in Operations → Catalogue → Fertilisers.</p>
          <div className="nd-prod-list">
            {catalogue.map((p) => {
              const on = !deselected.has(p.name)
              return (
                <label className={`nd-fert-row ${on ? 'on' : ''}`} key={p.name}>
                  <input type="checkbox" checked={on} onChange={() => toggleFert(p.name)} />
                  <span className="nd-prod-name">{p.name}</span>
                  <span className="nd-prod-comp">{KEYS.filter((k) => p[k] > 0).map((k) => `${k.toUpperCase()} ${p[k]}%`).join(' · ') || '—'}</span>
                </label>
              )
            })}
          </div>
          {products.length === 0 && <p className="calc-result-hint nd-fert-none">Tick at least one fertiliser to calculate a dose.</p>}
        </form>

        <div>
          {volumeL <= 0 ? (
            <div className="empty">Enter your reservoir volume to see the dose.</div>
          ) : noSavedTargets && targetsEmpty ? (
            <div className="empty">No recommended targets are saved for {cropName} yet. Enter target levels on the left to calculate a dose, or add them on the Crops page.</div>
          ) : targetsEmpty ? (
            <div className="empty">Set target levels to calculate a dose.</div>
          ) : result.doses.length === 0 ? (
            <div className="empty">Nothing to add — current levels already meet the targets.</div>
          ) : (
            <>
              <p className="calc-result-hint">
                To reach the {cropName} targets in {volumeL.toLocaleString()} L. Spread over <b>{weeks} week{weeks === 1 ? '' : 's'}</b> so no nutrient rises faster than its safe weekly limit — dose the weekly amount each week, re-testing as you go.
              </p>
              <details className="nd-caps">
                <summary>Safe weekly rise (ppm)</summary>
                <div className="nd-caps-grid">
                  {NUTRIENTS.map((n) => (
                    <label key={n.key} className="nd-cap-cell">
                      <span>{n.key.toUpperCase()}</span>
                      <input type="number" min="0" step="any" inputMode="decimal" value={caps[n.key] || 0} onChange={(e) => setCap(n.key, e.target.value)} />
                    </label>
                  ))}
                </div>
              </details>
              <div className="nd-table-wrap">
                <table className="nd-table">
                  <thead><tr><th>Fertiliser</th><th className="r">Per week</th><th className="r">Total ({weeks}w)</th></tr></thead>
                  <tbody>
                    {result.doses.map((d) => (
                      <tr key={d.name}><td><b>{d.name}</b></td><td className="r">{(d.grams / weeks).toFixed(1)} g</td><td className="r">{d.grams.toFixed(1)} g</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(mixes.A.length > 0 || mixes.B.length > 0 || mixes.C.length > 0) && (
                <>
                  <div className="calc-sub" style={{ marginTop: 22 }}>Mixing schedule <span className="hint">· per week</span></div>
                  <p className="calc-result-hint" style={{ marginTop: 0 }}>Dissolve each mix in its own water before adding to the reservoir — never combine calcium with the phosphate/sulphate mix in one concentrate (it precipitates). Amounts are per weekly dose.</p>
                  <div className="nd-mixes">
                    {([
                      { key: 'A', title: 'Mix A · Calcium', rows: mixes.A },
                      { key: 'B', title: 'Mix B · Potassium / Phosphorus', rows: mixes.B },
                      { key: 'C', title: 'Mix C · Micronutrients', rows: mixes.C },
                    ] as const).filter((m) => m.rows.length > 0).map((m) => (
                      <div className="nd-mix" key={m.key}>
                        <div className="nd-mix-title">{m.title}</div>
                        {m.rows.map((d) => (
                          <div className="nd-mix-row" key={d.name}><span>{d.name}</span><b>{(d.grams / weeks).toFixed(1)} g</b></div>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="calc-sub" style={{ marginTop: 22 }}>Projected result</div>
              <div className="nd-table-wrap" style={{ marginTop: 14 }}>
                <table className="nd-table">
                  <thead><tr><th>Element</th><th className="r">Current</th><th className="r">Projected</th><th className="r">Target</th></tr></thead>
                  <tbody>
                    {NUTRIENTS.map((n) => (
                      <tr key={n.key}>
                        <td><b>{n.label}</b></td>
                        <td className="r">{fmt(current[n.key] || 0)}</td>
                        <td className="r">{fmt(result.finalLevels[n.key] || 0)}</td>
                        <td className="r">{fmt(target[n.key] || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
      {saveProg && activeId && (
        <SaveAsDosingProgrammeModal systemId={activeId} cropName={selectedCrop?.name ?? 'Crop'} target={target} current={current} volumeL={volumeL} caps={caps} products={products} onClose={() => setSaveProg(false)} />
      )}
    </div>
  )
}
