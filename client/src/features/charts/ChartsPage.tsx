import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from 'recharts'
import { useSystems } from '../systems/SystemContext'
import { CHARTABLE, fetchSeries, type Chartable } from './api'
import '../dashboard/dashboard.css'
import './charts.css'

const GREEN = '#5ba83f'

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value" style={{ fontSize: 24 }}>
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
    </div>
  )
}

export function ChartsPage() {
  const { activeId, activeSystem } = useSystems()
  const [param, setParam] = useState<string>('temperature')
  const def = CHARTABLE.find((c) => c.key === param) as Chartable

  const { data: series = [], isLoading, isError } = useQuery({
    queryKey: ['series', activeId, param],
    queryFn: () => fetchSeries(activeId as string, param),
    enabled: !!activeId,
  })

  if (!activeId) return <div className="empty">Select a system to see charts.</div>

  const values = series.map((p) => p.value)
  const latest = values.length ? values[values.length - 1] : null
  const min = values.length ? Math.min(...values) : null
  const max = values.length ? Math.max(...values) : null
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
  const fmt = (n: number | null) => (n == null ? '—' : n.toFixed(def.unit === '' ? 2 : 1))

  return (
    <div>
      <div className="dash-head">
        <h1>Charts</h1>
        <span className="dash-sub">{activeSystem?.system_name}</span>
      </div>

      <div className="chart-controls">
        <label htmlFor="param">Parameter</label>
        <select id="param" className="sys-select" value={param} onChange={(e) => setParam(e.target.value)}>
          {CHARTABLE.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="metric-grid" style={{ marginBottom: 18 }}>
        <Stat label="Latest" value={fmt(latest)} unit={def.unit} />
        <Stat label="Average" value={fmt(avg)} unit={def.unit} />
        <Stat label="Min" value={fmt(min)} unit={def.unit} />
        <Stat label="Max" value={fmt(max)} unit={def.unit} />
      </div>

      <div className="chart-card">
        {isLoading ? (
          <div className="empty" style={{ border: 'none' }}>Loading…</div>
        ) : isError ? (
          <div className="empty" style={{ border: 'none' }}>Could not load chart data.</div>
        ) : series.length === 0 ? (
          <div className="empty" style={{ border: 'none' }}>No readings for {def.label} yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {(def.min != null || def.max != null) && (
                <ReferenceArea
                  y1={def.min ?? undefined}
                  y2={def.max ?? undefined}
                  fill={GREEN}
                  fillOpacity={0.06}
                  ifOverflow="extendDomain"
                />
              )}
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={20} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} width={44} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13 }}
                labelStyle={{ color: 'var(--ink-faint)' }}
                formatter={(v) => [`${v}${def.unit ? ' ' + def.unit : ''}`, def.label]}
              />
              <Area type="monotone" dataKey="value" stroke={GREEN} strokeWidth={2} fill="url(#fill)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {(def.min != null || def.max != null) && series.length > 0 && (
          <div className="chart-legend">
            <span className="swatch" /> Healthy range
            {def.min != null && def.max != null ? ` ${def.min}–${def.max}` : def.max != null ? ` < ${def.max}` : ` > ${def.min}`}
            {def.unit ? ` ${def.unit}` : ''}
          </div>
        )}
      </div>
    </div>
  )
}
