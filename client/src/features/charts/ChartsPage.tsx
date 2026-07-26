import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { useSystems } from '../systems/SystemContext'
import { CHARTABLE, fetchSeries, rangeDays, type Chartable, type ChartRangeKey, type SeriesPoint } from './api'
import { MetricChart } from './MetricChart'
import { RangeSelector } from './RangeSelector'
import '../dashboard/dashboard.css'
import './charts.css'

// Distinct line colors for overlaid metrics — readable in light and dark.
const PALETTE = ['#1462a8', '#4f9d3a', '#e0803a', '#8e5bd0', '#c0392b', '#1aa5a5', '#c9a227', '#d6559e']

export function ChartsPage() {
  const { activeId, activeSystem } = useSystems()
  const [selected, setSelected] = useState<string[]>(['temperature'])
  const [normalize, setNormalize] = useState(false)
  const [range, setRange] = useState<ChartRangeKey>('90d')
  const days = rangeDays(range)

  // One query per selected metric; results stay aligned with `selected` by index.
  const results = useQueries({
    queries: selected.map((key) => ({
      queryKey: ['series', activeId, key, range],
      queryFn: () => fetchSeries(activeId as string, key, { days }),
      enabled: !!activeId,
    })),
  })

  if (!activeId) return <div className="empty">Select a system to see charts.</div>

  const defOf = (key: string) => CHARTABLE.find((c) => c.key === key) as Chartable
  function toggle(key: string) {
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]))
  }

  const isLoading = results.some((r) => r.isLoading)
  const isError = results.some((r) => r.isError)
  const seriesByKey: Record<string, SeriesPoint[]> = {}
  selected.forEach((key, i) => {
    seriesByKey[key] = results[i].data ?? []
  })
  const colorOf = (key: string) => PALETTE[selected.indexOf(key) % PALETTE.length]

  return (
    <div>
      <div className="dash-head">
        <h1>Charts</h1>
        <span className="dash-sub">{activeSystem?.system_name}</span>
      </div>
      <div className="chart-range-bar">
        <RangeSelector value={range} onChange={setRange} />
      </div>

      <div className="chip-row">
        {CHARTABLE.map((c) => {
          const on = selected.includes(c.key)
          return (
            <button
              key={c.key}
              type="button"
              className={`chip${on ? ' on' : ''}`}
              onClick={() => toggle(c.key)}
              style={on ? { background: colorOf(c.key) } : undefined}
              aria-pressed={on}
            >
              <span className="chip-dot" style={{ background: on ? undefined : colorOf(c.key) }} />
              {c.label}
            </button>
          )
        })}
      </div>

      {selected.length === 0 ? (
        <div className="empty">Pick one or more parameters to chart.</div>
      ) : selected.length === 1 ? (
        <MetricChart
          series={seriesByKey[selected[0]]}
          label={defOf(selected[0]).label}
          unit={defOf(selected[0]).unit}
          min={defOf(selected[0]).min}
          max={defOf(selected[0]).max}
          isLoading={isLoading}
          isError={isError}
        />
      ) : (
        <>
          <label className="norm-toggle">
            <input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} />
            Normalize each metric to its own range — compare trends across different scales
          </label>
          <MultiChart selected={selected} seriesByKey={seriesByKey} colorOf={colorOf} defOf={defOf} normalize={normalize} isLoading={isLoading} isError={isError} />
        </>
      )}
    </div>
  )
}

type MultiProps = {
  selected: string[]
  seriesByKey: Record<string, SeriesPoint[]>
  colorOf: (key: string) => string
  defOf: (key: string) => Chartable
  normalize: boolean
  isLoading: boolean
  isError: boolean
}

// Overlay several metrics on one time axis. In "actual" mode values keep their
// raw scale (best for comparable parameters); in "normalize" mode each metric is
// rescaled to 0–100% of its own min–max so trends line up across scales. The
// legend names each line with its unit and latest (real) value.
function MultiChart({ selected, seriesByKey, colorOf, defOf, normalize, isLoading, isError }: MultiProps) {
  // Per-metric min/max, used to rescale in normalize mode.
  const range: Record<string, { min: number; max: number }> = {}
  for (const key of selected) {
    const vals = (seriesByKey[key] ?? []).map((p) => p.value)
    range[key] = { min: vals.length ? Math.min(...vals) : 0, max: vals.length ? Math.max(...vals) : 0 }
  }
  const scale = (key: string, v: number) => {
    if (!normalize) return v
    const { min, max } = range[key]
    return max > min ? ((v - min) / (max - min)) * 100 : 50
  }

  // Merge every metric's points into one row per calendar day. Plotted value goes
  // under `key`; the raw value is kept under `key__raw` for the tooltip.
  const byDay = new Map<string, Record<string, number | string>>()
  for (const key of selected) {
    for (const p of seriesByKey[key] ?? []) {
      const day = p.date.slice(0, 10)
      const row = byDay.get(day) ?? { day, label: p.label }
      row[key] = scale(key, p.value)
      row[`${key}__raw`] = p.value
      byDay.set(day, row)
    }
  }
  const data = [...byDay.values()].sort((a, b) => String(a.day).localeCompare(String(b.day)))
  const anyData = selected.some((k) => (seriesByKey[k] ?? []).length > 0)

  const latestOf = (key: string) => {
    const s = seriesByKey[key] ?? []
    return s.length ? s[s.length - 1].value : null
  }

  return (
    <div className="chart-card">
      {isLoading ? (
        <div className="empty" style={{ border: 'none' }}>Loading…</div>
      ) : isError ? (
        <div className="empty" style={{ border: 'none' }}>Could not load chart data.</div>
      ) : !anyData ? (
        <div className="empty" style={{ border: 'none' }}>No readings for the selected parameters yet.</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={24} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--ink-faint)' }}
                tickLine={false}
                axisLine={false}
                width={normalize ? 46 : 40}
                domain={normalize ? [0, 100] : ['auto', 'auto']}
                tickFormatter={normalize ? (v) => `${v}%` : undefined}
              />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, boxShadow: 'var(--shadow)' }}
                labelStyle={{ color: 'var(--ink-faint)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--ink)' }}
                formatter={(v, name, item) => {
                  const key = String(name)
                  const def = defOf(key)
                  // Show the real value, not the normalized one.
                  const raw = (item?.payload?.[`${key}__raw`] as number | undefined) ?? (v as number)
                  return [`${raw}${def.unit ? ' ' + def.unit : ''}`, def.label]
                }}
              />
              {selected.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={colorOf(key)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="chart-legend multi">
            {selected.map((key) => {
              const def = defOf(key)
              const latest = latestOf(key)
              return (
                <span className="legend-item" key={key}>
                  <span className="swatch" style={{ background: colorOf(key) }} />
                  {def.label}
                  {latest != null && (
                    <b>
                      {latest.toFixed(def.unit === '' ? 2 : 1)}
                      {def.unit ? ` ${def.unit}` : ''}
                    </b>
                  )}
                </span>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
