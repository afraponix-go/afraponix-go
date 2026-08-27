import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from 'recharts'
import { useSystems } from '../systems/SystemContext'
import type { System } from '../systems/api'
import { CHARTABLE, fetchSeries, rangeDays, type Chartable, type ChartRangeKey } from './api'
import { RangeSelector } from './RangeSelector'
import '../dashboard/dashboard.css'
import '../systems/farmview.css'
import './charts.css'

const LINE = '#1462a8'

// Whole-farm charts: pick one metric and a range, then see a compact sparkline
// per system so trends compare side by side. Click a card to open that system's
// full charts (where several metrics can be overlaid).
export function ChartsFarm() {
  const { systems, setActiveId, activeFarm } = useSystems()
  const [metric, setMetric] = useState<string>('temperature')
  const [range, setRange] = useState<ChartRangeKey>('90d')
  const def = CHARTABLE.find((c) => c.key === metric) as Chartable
  const ordered = [...systems].sort((a, b) => a.system_name.localeCompare(b.system_name, undefined, { numeric: true }))

  return (
    <div className="fm">
      <div className="fm-bar">
        <div className="fm-bar-title">
          <span className="fm-eyebrow">All systems</span>
          <b>{activeFarm?.name ?? 'Farm'}</b>
        </div>
        <span className="fm-loading">Click a system to open its full charts</span>
      </div>

      <div className="chf-controls">
        <div className="chip-row">
          {CHARTABLE.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`chip${metric === c.key ? ' on' : ''}`}
              onClick={() => setMetric(c.key)}
              style={metric === c.key ? { background: LINE } : undefined}
              aria-pressed={metric === c.key}
            >
              <span className="chip-dot" style={{ background: metric === c.key ? undefined : LINE }} />
              {c.label}
            </button>
          ))}
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {ordered.length === 0 && <div className="empty">No systems in this farm yet.</div>}

      <div className="chf-grid">
        {ordered.map((s) => (
          <SystemSparkCard key={s.id} system={s} metric={metric} def={def} range={range} onOpen={() => setActiveId(s.id)} />
        ))}
      </div>
    </div>
  )
}

function SystemSparkCard({ system, metric, def, range, onOpen }: { system: System; metric: string; def: Chartable; range: ChartRangeKey; onOpen: () => void }) {
  const days = rangeDays(range)
  const { data: series = [], isLoading } = useQuery({
    queryKey: ['series', system.id, metric, range],
    queryFn: () => fetchSeries(system.id, metric, { days }),
  })

  const latest = series.length ? series[series.length - 1].value : null
  const fmt = (v: number) => `${v.toFixed(def.unit === '' ? 2 : 1)}${def.unit ? ` ${def.unit}` : ''}`

  return (
    <button type="button" className="chf-card" onClick={onOpen} aria-label={`Open ${system.system_name} charts`}>
      <div className="chf-head">
        <span className="chf-name">{system.system_name}</span>
        <span className="chf-open">Open ↗</span>
      </div>
      <div className="chf-metric">
        <span className="chf-metric-label">{def.label}</span>
        <span className="chf-metric-val">{latest != null ? fmt(latest) : '—'}</span>
      </div>
      <div className="chf-spark">
        {isLoading ? (
          <span className="chf-muted">Loading…</span>
        ) : series.length === 0 ? (
          <span className="chf-muted">No readings</span>
        ) : (
          <ResponsiveContainer width="100%" height={56}>
            <LineChart data={series} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow)' }}
                labelStyle={{ display: 'none' }}
                formatter={(v) => [fmt(v as number), def.label]}
              />
              <Line type="monotone" dataKey="value" stroke={LINE} strokeWidth={1.75} dot={false} isAnimationActive={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </button>
  )
}
