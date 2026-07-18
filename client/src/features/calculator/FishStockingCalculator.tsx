import { useState } from 'react'
import { SPECIES, calcStocking, type SpeciesKey } from './fishStocking'
import '../dashboard/dashboard.css'
import './calculator.css'

function num(v: string): number | undefined {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function Result({ label, value, unit, status }: { label: string; value: string; unit?: string; status?: 'good' | 'warn' }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {status && <span className={`status ${status}`}>{status === 'good' ? 'Within limit' : 'Over limit'}</span>}
    </div>
  )
}

export function FishStockingCalculator() {
  const [species, setSpecies] = useState<SpeciesKey>('tilapia')
  const [volume, setVolume] = useState('')
  const [harvest, setHarvest] = useState('500')
  const [count, setCount] = useState('')
  const [weight, setWeight] = useState('')

  const result = calcStocking({
    species,
    volumeL: num(volume) ?? 0,
    harvestWeightG: num(harvest) ?? 0,
    currentCount: num(count),
    currentWeightG: num(weight),
  })

  return (
    <div>
      <div className="dash-head">
        <h1 style={{ marginTop: 0 }}>Fish Stocking</h1>
        <span className="dash-sub">Safe stocking capacity for a tank</span>
      </div>

      <div className="calc-layout">
        <form className="calc-form" onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label htmlFor="species">Species</label>
            <select id="species" value={species} onChange={(e) => setSpecies(e.target.value as SpeciesKey)}>
              {SPECIES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} · max {s.maxDensity} kg/m³
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="volume">Tank volume <span className="hint">(litres)</span></label>
            <input id="volume" type="number" min="0" step="10" inputMode="decimal" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="e.g. 7000" />
          </div>
          <div className="field">
            <label htmlFor="harvest">Target harvest weight <span className="hint">(grams)</span></label>
            <input id="harvest" type="number" min="0" step="10" inputMode="decimal" value={harvest} onChange={(e) => setHarvest(e.target.value)} placeholder="e.g. 500" />
          </div>

          <hr className="calc-divider" />
          <div className="calc-sub">Current stock (optional)</div>
          <div className="field">
            <label htmlFor="count">Fish count</label>
            <input id="count" type="number" min="0" step="1" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} placeholder="e.g. 180" />
          </div>
          <div className="field">
            <label htmlFor="weight">Average weight <span className="hint">(grams)</span></label>
            <input id="weight" type="number" min="0" step="1" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 50" />
          </div>
        </form>

        <div>
          {!result ? (
            <div className="empty">Enter a tank volume to see the stocking capacity.</div>
          ) : (
            <>
              <p className="calc-result-hint">
                At {result.maxDensity} kg/m³ max density for {SPECIES.find((s) => s.key === species)?.label.toLowerCase()}.
              </p>
              <div className="metric-grid">
                <Result label="Max Biomass" value={result.maxBiomassKg.toFixed(1)} unit="kg" />
                <Result label="Max Fish (at harvest wt)" value={result.maxFishAtHarvest != null ? result.maxFishAtHarvest.toLocaleString() : '—'} />
                <Result label="Rule of Thumb" value={result.byVolumeRule.toLocaleString()} unit="fish" />
              </div>

              {result.current && (
                <>
                  <div className="calc-sub" style={{ marginTop: 26 }}>Current stock vs capacity</div>
                  <div className="metric-grid">
                    <Result label="Current Biomass" value={result.current.biomassKg.toFixed(1)} unit="kg" />
                    <Result
                      label="Current Density"
                      value={result.current.densityKgM3.toFixed(2)}
                      unit="kg/m³"
                      status={result.current.densityKgM3 <= result.maxDensity ? 'good' : 'warn'}
                    />
                    <Result
                      label="Capacity Used"
                      value={result.current.pctOfMax.toFixed(0)}
                      unit="%"
                      status={result.current.pctOfMax <= 100 ? 'good' : 'warn'}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
