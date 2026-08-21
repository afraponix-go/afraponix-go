import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchCrops, fetchRanges, fetchLatestLevels, computeDoses, DOSING_NUTRIENTS } from './nutrientDosing'
import '../dashboard/dashboard.css'
import './calculator.css'

const fmt = (n: number, d = 1) => (n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(d))

export function NutrientDosingCalculator() {
  const { activeId } = useSystems()
  const [cropCode, setCropCode] = useState('lettuce')
  const [volume, setVolume] = useState('')
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const cropsQ = useQuery({ queryKey: ['ck-crops'], queryFn: fetchCrops })
  const rangesQ = useQuery({ queryKey: ['ck-ranges', cropCode], queryFn: () => fetchRanges(cropCode), enabled: !!cropCode })
  const latestQ = useQuery({ queryKey: ['nutrients-latest', activeId], queryFn: () => fetchLatestLevels(activeId as string), enabled: !!activeId })

  const latest = latestQ.data ?? {}
  const crop = cropsQ.data?.find((c) => c.code === cropCode)
  const volumeL = Number(volume) > 0 ? Number(volume) : 0

  // Effective current level per reading key: manual override, else latest reading.
  const current = useMemo(() => {
    const out: Record<string, number | null> = {}
    for (const n of DOSING_NUTRIENTS) {
      const ov = overrides[n.readKey]
      if (ov != null && ov !== '') out[n.readKey] = Number(ov)
      else if (latest[n.readKey] != null) out[n.readKey] = latest[n.readKey]
      else out[n.readKey] = null
    }
    return out
  }, [overrides, latest])

  const rows = useMemo(() => computeDoses(rangesQ.data ?? {}, current, volumeL), [rangesQ.data, current, volumeL])
  const displayVal = (readKey: string) => overrides[readKey] ?? (latest[readKey] != null ? String(latest[readKey]) : '')

  return (
    <div>
      <div className="dash-head">
        <h1 style={{ marginTop: 0 }}>Nutrient Dosing</h1>
        <span className="dash-sub">How much to add to hit a crop's target levels</span>
      </div>

      <div className="calc-layout">
        <form className="calc-form" onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label htmlFor="nd-crop">Target crop</label>
            <select id="nd-crop" value={cropCode} onChange={(e) => setCropCode(e.target.value)}>
              {(cropsQ.data ?? []).map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="nd-vol">Reservoir volume <span className="hint">(litres)</span></label>
            <input id="nd-vol" type="number" min="0" step="10" inputMode="decimal" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="e.g. 2000" />
          </div>

          {crop && (crop.default_ec_min || crop.default_ph_min) && (
            <div className="nd-targets">
              {crop.default_ec_min && <span>Target EC <b>{crop.default_ec_min}–{crop.default_ec_max}</b> mS/cm</span>}
              {crop.default_ph_min && <span>Target pH <b>{crop.default_ph_min}–{crop.default_ph_max}</b></span>}
            </div>
          )}

          <hr className="calc-divider" />
          <div className="calc-sub">Current levels</div>
          <p className="calc-result-hint" style={{ marginTop: 0 }}>
            {activeId ? (latestQ.isLoading ? 'Loading latest readings…' : 'Pre-filled from your latest readings — edit any value.') : 'Select a system to auto-fill from readings, or type current levels.'}
          </p>
          {DOSING_NUTRIENTS.map((n) => (
            <div className="field nd-cur" key={n.readKey}>
              <label htmlFor={`nd-cur-${n.readKey}`}>{n.label} <span className="hint">{n.sub}</span></label>
              <input
                id={`nd-cur-${n.readKey}`}
                type="number" min="0" step="0.1" inputMode="decimal"
                value={displayVal(n.readKey)}
                onChange={(e) => setOverrides((o) => ({ ...o, [n.readKey]: e.target.value }))}
                placeholder="ppm"
              />
            </div>
          ))}
        </form>

        <div>
          {volumeL <= 0 ? (
            <div className="empty">Enter your reservoir volume to see the dose.</div>
          ) : rows.length === 0 ? (
            <div className="empty">No nutrient targets found for this crop.</div>
          ) : (
            <>
              <p className="calc-result-hint">
                To reach {crop?.name ?? 'the crop'}'s targets in {volumeL.toLocaleString()} L. Fertiliser amounts are a guide — some salts (e.g. calcium nitrate) raise more than one nutrient.
              </p>
              <div className="nd-table-wrap">
                <table className="nd-table">
                  <thead>
                    <tr>
                      <th>Nutrient</th>
                      <th className="r">Current</th>
                      <th className="r">Target</th>
                      <th className="r">To add</th>
                      <th className="r">Element</th>
                      <th>Fertiliser</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.code} className={r.deficit <= 0 ? 'ok-row' : ''}>
                        <td><b>{r.label}</b> <span className="nd-sub">{r.sub}</span></td>
                        <td className="r">{r.current == null ? '—' : `${fmt(r.current)}`}</td>
                        <td className="r">{fmt(r.target)}</td>
                        <td className="r">{r.deficit <= 0 ? <span className="nd-at">at target</span> : `+${fmt(r.deficit)} ppm`}</td>
                        <td className="r">{r.deficit <= 0 ? '—' : `${fmt(r.gramsElement, 1)} g`}</td>
                        <td>{r.deficit <= 0 ? '—' : <><b>{fmt(r.gramsFert, 1)} g</b> {r.fert}</>}</td>
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
