import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory } from '../fish/api'
import { fetchGrowBedConfigs } from '../growbeds/api'
import {
  CROPS,
  CROP_TARGETS,
  DEFAULT_PRODUCTS,
  NUTRIENTS,
  KEYS,
  computeDose,
  ecFromLevels,
  emptyLevels,
  fetchLatestLevels,
  type Levels,
  type NutrientKey,
  type Product,
  type SystemType,
} from './nutrientDosing'
import '../dashboard/dashboard.css'
import './calculator.css'

const numOr0 = (v: string) => (v === '' ? 0 : Number(v) || 0)
const fmt = (n: number, d = 1) => (n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(d))

export function NutrientDosingCalculator() {
  const { activeId } = useSystems()
  const [cropCode, setCropCode] = useState('lettuce')
  const [systemType, setSystemType] = useState<SystemType>('aquaponic')
  const [volume, setVolume] = useState('')
  const [startingEC, setStartingEC] = useState('')

  const [target, setTarget] = useState<Levels>(CROP_TARGETS.aquaponic.lettuce)
  const [current, setCurrent] = useState<Levels>(emptyLevels)
  const [currentTouched, setCurrentTouched] = useState(false)
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS)
  const [newProd, setNewProd] = useState<{ name: string } & Record<NutrientKey, string>>({ name: '', n: '', p: '', k: '', ca: '', mg: '', fe: '' })

  const latestQ = useQuery({ queryKey: ['nutrients-latest', activeId], queryFn: () => fetchLatestLevels(activeId as string), enabled: !!activeId })
  const tanksQ = useQuery({ queryKey: ['fish-inventory', activeId], queryFn: () => fetchFishInventory(activeId as string), enabled: !!activeId })
  const bedsQ = useQuery({ queryKey: ['grow-bed-configs', activeId], queryFn: () => fetchGrowBedConfigs(activeId as string), enabled: !!activeId })

  // Targets follow the crop + system-type preset (still editable after).
  useEffect(() => {
    setTarget(CROP_TARGETS[systemType][cropCode])
  }, [cropCode, systemType])

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
  const targetEC = ecFromLevels(target)
  const result = useMemo(() => computeDose(volumeL, current, target, products), [volumeL, current, target, products])
  const finalEC = ecFromLevels(result.finalLevels)

  const setCur = (k: NutrientKey, v: string) => { setCurrent((c) => ({ ...c, [k]: numOr0(v) })); setCurrentTouched(true) }
  const setTgt = (k: NutrientKey, v: string) => setTarget((t) => ({ ...t, [k]: numOr0(v) }))

  function addProduct() {
    const name = newProd.name.trim()
    if (!name) return
    setProducts((p) => [...p, { name, n: numOr0(newProd.n), p: numOr0(newProd.p), k: numOr0(newProd.k), ca: numOr0(newProd.ca), mg: numOr0(newProd.mg), fe: numOr0(newProd.fe) }])
    setNewProd({ name: '', n: '', p: '', k: '', ca: '', mg: '', fe: '' })
  }

  return (
    <div>
      <div className="dash-head">
        <h1 style={{ marginTop: 0 }}>Nutrient Dosing</h1>
        <span className="dash-sub">Dose your reservoir to a crop's target levels</span>
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

          <div className="io-row">
            <div className="field">
              <label htmlFor="nd-crop">Crop</label>
              <select id="nd-crop" value={cropCode} onChange={(e) => setCropCode(e.target.value)}>
                {CROPS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="nd-sys">System</label>
              <select id="nd-sys" value={systemType} onChange={(e) => setSystemType(e.target.value as SystemType)}>
                <option value="aquaponic">Aquaponics</option>
                <option value="hydroponic">Hydroponics</option>
              </select>
            </div>
          </div>

          <div className="io-row">
            <div className="field">
              <label htmlFor="nd-ec0">Starting EC <span className="hint">(mS/cm)</span></label>
              <input id="nd-ec0" type="number" min="0" step="0.1" inputMode="decimal" value={startingEC} onChange={(e) => setStartingEC(e.target.value)} placeholder="current EC" />
            </div>
            <div className="field">
              <label htmlFor="nd-ec1">Target EC <span className="hint">(auto)</span></label>
              <input id="nd-ec1" type="number" value={targetEC.toFixed(2)} readOnly tabIndex={-1} />
            </div>
          </div>

          <hr className="calc-divider" />
          <div className="calc-sub">Levels (ppm)</div>
          <p className="calc-result-hint" style={{ marginTop: 0 }}>
            {activeId ? 'Current pre-filled from your latest readings; targets from the crop preset — edit any value.' : 'Enter current levels; targets come from the crop preset.'}
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
          <div className="calc-sub">Fertilisers</div>
          <p className="calc-result-hint" style={{ marginTop: 0 }}>Products the calculator can dose with, and their element %.</p>
          <div className="nd-prod-list">
            {products.map((p, i) => (
              <div className="nd-prod" key={i}>
                <span className="nd-prod-name">{p.name}</span>
                <span className="nd-prod-comp">{KEYS.filter((k) => p[k] > 0).map((k) => `${k.toUpperCase()} ${p[k]}%`).join(' · ') || '—'}</span>
                <button type="button" className="nd-prod-x" title="Remove" onClick={() => setProducts((list) => list.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
          <details className="nd-add">
            <summary>+ Add a fertiliser</summary>
            <input className="nd-add-name" type="text" placeholder="Name" value={newProd.name} onChange={(e) => setNewProd((p) => ({ ...p, name: e.target.value }))} />
            <div className="nd-add-grid">
              {KEYS.map((k) => (
                <input key={k} type="number" min="0" step="0.1" inputMode="decimal" placeholder={`${k.toUpperCase()}%`} value={newProd[k]} onChange={(e) => setNewProd((p) => ({ ...p, [k]: e.target.value }))} />
              ))}
            </div>
            <button type="button" className="io-btn primary" onClick={addProduct}>Add</button>
          </details>
        </form>

        <div>
          {volumeL <= 0 ? (
            <div className="empty">Enter your reservoir volume to see the dose.</div>
          ) : result.doses.length === 0 ? (
            <div className="empty">Nothing to add — current levels already meet the targets.</div>
          ) : (
            <>
              <p className="calc-result-hint">
                Add these to {volumeL.toLocaleString()} L to reach the {CROPS.find((c) => c.code === cropCode)?.name} ({systemType === 'aquaponic' ? 'aquaponic' : 'hydroponic'}) targets.
              </p>
              <div className="nd-table-wrap">
                <table className="nd-table">
                  <thead><tr><th>Fertiliser</th><th className="r">Amount</th></tr></thead>
                  <tbody>
                    {result.doses.map((d) => (
                      <tr key={d.name}><td><b>{d.name}</b></td><td className="r">{d.grams.toFixed(1)} g</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="calc-sub" style={{ marginTop: 22 }}>Projected result</div>
              <div className="metric-grid">
                <div className="metric"><div className="label">EC after dosing</div><div className="value">{finalEC.toFixed(2)}<span className="unit">mS/cm</span></div></div>
                <div className="metric"><div className="label">Target EC</div><div className="value">{targetEC.toFixed(2)}<span className="unit">mS/cm</span></div></div>
              </div>
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
    </div>
  )
}
