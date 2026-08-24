import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useSystems } from '../systems/SystemContext'
import { fetchFarmSummary, updateFarm } from '../systems/farmApi'
import { Stat, fmt } from '../fish/fishShared'
import { WATER_FIELDS } from '../water/api'
import { CHARTABLE } from '../charts/api'
import './dashboard.css'

// Metric label + unit (from the water form) and healthy band (from the chart
// defs) for the selectable per-system columns.
const METRIC_META: Record<string, { label: string; unit: string; min?: number; max?: number }> = Object.fromEntries(
  WATER_FIELDS.map((f) => {
    const c = CHARTABLE.find((x) => x.key === f.key)
    return [f.key, { label: f.label, unit: f.unit, min: c?.min, max: c?.max }]
  }),
)

function bandState(key: string, value: number | null | undefined): 'ok' | 'warn' | 'none' {
  const m = METRIC_META[key]
  if (value == null || !m || (m.min == null && m.max == null)) return 'none'
  if (m.min != null && value < m.min) return 'warn'
  if (m.max != null && value > m.max) return 'warn'
  return 'ok'
}

export function FarmDashboardPage() {
  const { activeFarm, activeFarmId, setActiveId } = useSystems()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const own = activeFarm?.kind === 'own'
  const [customizing, setCustomizing] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['farm-summary', activeFarmId],
    queryFn: () => fetchFarmSummary(activeFarmId as string),
    enabled: own && !!activeFarmId,
  })

  const setMetrics = useMutation({
    mutationFn: (keys: string[]) => updateFarm(activeFarmId as string, { display_metrics: keys }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['farm-summary', activeFarmId] }),
  })

  if (!own) {
    return <div className="empty">The farm overview is for your own farms. Pick one of your farms from the switcher in the header.</div>
  }

  const t = data?.totals
  const cols = data?.display_metrics ?? []
  const selected = new Set(cols)
  // A metric only counts (band / attention) when the system actually tracks it —
  // i.e. the key is present in its metrics map.
  const attentionCount = (data?.systems ?? []).filter((s) => cols.some((k) => k in s.metrics && bandState(k, s.metrics[k]) === 'warn')).length
  const openSystem = (id: string) => { setActiveId(id); navigate('/') }
  const toggle = (key: string) => {
    const next = selected.has(key) ? cols.filter((k) => k !== key) : [...cols, key]
    setMetrics.mutate(next)
  }

  return (
    <div>
      <div className="dash-head">
        <h1>{data?.farm.name ?? activeFarm?.name ?? 'Farm'}</h1>
        <span className="dash-sub">
          {isLoading ? 'Loading farm rollup…' : isError ? 'Could not load the farm rollup' : `${data?.system_count ?? 0} system${(data?.system_count ?? 0) === 1 ? '' : 's'}${attentionCount > 0 ? ` · ${attentionCount} need attention` : ''}`}
        </span>
      </div>

      {data && data.system_count === 0 ? (
        <div className="empty">No systems in this farm yet. Add one from the “+” in the header.</div>
      ) : (
        <>
          <div className="metric-grid">
            <Stat label="Total Fish" value={fmt(t?.fish_count ?? 0)} sub={`Across ${data?.system_count ?? 0} system${(data?.system_count ?? 0) === 1 ? '' : 's'}`} />
            <Stat label="Total Biomass" value={fmt(t?.biomass_kg ?? 0, 1)} unit="kg" sub="Live fish across the farm" />
            <Stat label="Plants Growing" value={fmt(t?.plants_growing ?? 0)} sub="Remaining in all beds" />
            <Stat label="Ready to Harvest" value={fmt(t?.plants_ready ?? 0)} sub="Reached days-to-harvest" />
          </div>

          <div className="farm-sys-head">
            <h2 className="section-title" style={{ margin: 0 }}>Systems</h2>
            <div className="farm-customize">
              <button type="button" className="farm-cust-btn" onClick={() => setCustomizing((v) => !v)} aria-expanded={customizing}>⚙ Columns</button>
              {customizing && (
                <>
                  <div className="popover-backdrop" onClick={() => setCustomizing(false)} />
                  <div className="farm-cust-menu" role="menu">
                    <div className="farm-cust-title">Metric columns</div>
                    {WATER_FIELDS.map((f) => (
                      <label key={f.key} className="farm-cust-item">
                        <input type="checkbox" checked={selected.has(f.key)} onChange={() => toggle(f.key)} disabled={setMetrics.isPending} />
                        <span>{f.label}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="farm-tablewrap">
            <table className="farm-table">
              <thead>
                <tr>
                  <th>System</th>
                  <th className="r">Fish</th>
                  <th className="r">Biomass</th>
                  <th className="r">Growing</th>
                  <th className="r">Ready</th>
                  {cols.map((k) => <th key={k} className="r">{METRIC_META[k]?.label ?? k}</th>)}
                </tr>
              </thead>
              <tbody>
                {(data?.systems ?? []).map((s) => {
                  const attn = cols.some((k) => k in s.metrics && bandState(k, s.metrics[k]) === 'warn')
                  return (
                    <tr key={s.id} className="farm-row" onClick={() => openSystem(s.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') openSystem(s.id) }}>
                      <td className="farm-td-sys">
                        <b>{s.system_name}</b>
                        {attn && <span className="farm-attn" title="A reading is out of range">Needs attention</span>}
                      </td>
                      <td className="r" data-label="Fish">{fmt(s.fish_count)}</td>
                      <td className="r" data-label="Biomass">{fmt(s.biomass_kg, 1)} kg</td>
                      <td className="r" data-label="Growing">{fmt(s.plants_growing)}</td>
                      <td className="r" data-label="Ready">{s.plants_ready > 0 ? <b className="farm-ready">{fmt(s.plants_ready)}</b> : '—'}</td>
                      {cols.map((k) => {
                        const tracked = k in s.metrics
                        const v = s.metrics[k]
                        const state = tracked ? bandState(k, v) : 'none'
                        return (
                          <td key={k} className="r" data-label={METRIC_META[k]?.label ?? k}>
                            {!tracked ? <span className="metric-off" title="Not tracked by this system">off</span>
                              : v == null ? <span className="ph-none">—</span>
                              : state === 'none' ? fmt(v, 1)
                              : <span className={`ph-pill ${state}`}>{fmt(v, 1)}</span>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
