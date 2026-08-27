import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useSystems } from '../systems/SystemContext'
import { CHARTABLE, fetchSeries, rangeDays, type Chartable, type ChartRangeKey, type SeriesPoint } from './api'
import { RangeSelector } from './RangeSelector'
import '../dashboard/dashboard.css'
import '../systems/farmview.css'
import './charts.css'

// Distinct, theme-legible colours — one per system.
const PALETTE = ['#1462a8', '#4f9d3a', '#e0803a', '#8e5bd0', '#c0392b', '#1aa5a5', '#c9a227', '#d6559e']

// Whole-farm charts: pick one metric + range and overlay every system on a
// single chart, one line each, so trends compare directly. The legend names
// each system with its latest value; click a name to open its full charts.
export function ChartsFarm() {
  const { systems, setActiveId, activeFarm } = useSystems()
  const [metric, setMetric] = useState<string>('temperature')
  const [range, setRange] = useState<ChartRangeKey>('90d')
  const def = CHARTABLE.find((c) => c.key === metric) as Chartable
  const days = rangeDays(range)
  const ordered = [...systems].sort((a, b) => a.system_name.localeCompare(b.system_name, undefined, { numeric: true }))

  const results = useQueries({
    queries: ordered.map((s) => ({
      queryKey: ['series', s.id, metric, range],
      queryFn: () => fetchSeries(s.id, metric, { days }),
    })),
  })

  const seriesBySystem: Record<string, SeriesPoint[]> = {}
  ordered.forEach((s, i) => { seriesBySystem[s.id] = results[i].data ?? [] })
  const colorOf = (i: number) => PALETTE[i % PALETTE.length]
  const isLoading = results.some((r) => r.isLoading)
  const isError = results.some((r) => r.isError)

  // Merge every system's points into one row per calendar day.
  const byDay = new Map<string, Record<string, number | string>>()
  ordered.forEach((s) => {
    for (const p of seriesBySystem[s.id]) {
      const day = p.date.slice(0, 10)
      const row = byDay.get(day) ?? { day, label: p.label }
      row[s.id] = p.value
      byDay.set(day, row)
    }
  })
  const data = [...byDay.values()].sort((a, b) => String(a.day).localeCompare(String(b.day)))
  const anyData = ordered.some((s) => seriesBySystem[s.id].length > 0)

  const fmt = (v: number) => `${v.toFixed(def.unit === '' ? 2 : 1)}${def.unit ? ` ${def.unit}` : ''}`
  const latestOf = (id: string) => { const s = seriesBySystem[id]; return s.length ? s[s.length - 1].value : null }

  return (
    <div className="fm">
      <div className="fm-bar">
        <div className="fm-bar-title">
          <span className="fm-eyebrow">All systems</span>
          <b>{activeFarm?.name ?? 'Farm'}</b>
        </div>
        <span className="fm-loading">{def.label} across every system</span>
      </div>

      <div className="chf-controls">
        <div className="chip-row">
          {CHARTABLE.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`chip${metric === c.key ? ' on' : ''}`}
              onClick={() => setMetric(c.key)}
              style={metric === c.key ? { background: PALETTE[0] } : undefined}
              aria-pressed={metric === c.key}
            >
              <span className="chip-dot" style={{ background: metric === c.key ? undefined : PALETTE[0] }} />
              {c.label}
            </button>
          ))}
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {ordered.length === 0 ? (
        <div className="empty">No systems in this farm yet.</div>
      ) : (
        <div className="chart-card">
          {isLoading ? (
            <div className="empty" style={{ border: 'none' }}>Loading…</div>
          ) : isError ? (
            <div className="empty" style={{ border: 'none' }}>Could not load chart data.</div>
          ) : !anyData ? (
            <div className="empty" style={{ border: 'none' }}>No {def.label} readings across the farm yet.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} width={44} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, boxShadow: 'var(--shadow)' }}
                    labelStyle={{ color: 'var(--ink-faint)', fontWeight: 600 }}
                    itemStyle={{ color: 'var(--ink)' }}
                    formatter={(v, name) => [fmt(v as number), String(name)]}
                  />
                  {ordered.map((s, i) => (
                    <Line
                      key={s.id}
                      type="monotone"
                      dataKey={s.id}
                      name={s.system_name}
                      stroke={colorOf(i)}
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
                {ordered.map((s, i) => {
                  const latest = latestOf(s.id)
                  return (
                    <button type="button" className="legend-item chf-legend-btn" key={s.id} onClick={() => setActiveId(s.id)} title={`Open ${s.system_name} charts`}>
                      <span className="swatch" style={{ background: colorOf(i) }} />
                      {s.system_name}
                      {latest != null && <b>{fmt(latest)}</b>}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
