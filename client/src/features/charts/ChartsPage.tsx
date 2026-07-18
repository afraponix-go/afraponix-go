import { useEffect, useState } from 'react'
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

// Read a CSS custom property and keep it current across theme changes, so the
// chart's colors track light/dark like the rest of the app.
function useCssVar(name: string, fallback: string) {
  const [val, setVal] = useState(fallback)
  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      if (v) setVal(v)
    }
    read()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', read)
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', read)
      obs.disconnect()
    }
  }, [name])
  return val
}

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

  const accent = useCssVar('--accent', '#1462a8')
  const green = useCssVar('--brand-green', '#4f9d3a')

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
  const lastIndex = series.length - 1

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
            <AreaChart data={series} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {(def.min != null || def.max != null) && (
                <ReferenceArea y1={def.min ?? undefined} y2={def.max ?? undefined} fill={green} fillOpacity={0.08} ifOverflow="extendDomain" />
              )}
              <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                cursor={{ stroke: accent, strokeWidth: 1, strokeDasharray: '3 3' }}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, boxShadow: 'var(--shadow)' }}
                labelStyle={{ color: 'var(--ink-faint)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--ink)' }}
                formatter={(v) => [`${v}${def.unit ? ' ' + def.unit : ''}`, def.label]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={accent}
                strokeWidth={2}
                fill="url(#fill)"
                isAnimationActive={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                dot={(props) => {
                  const { cx, cy, index, key } = props as { cx: number; cy: number; index: number; key?: string }
                  return index === lastIndex ? (
                    <circle key={key} cx={cx} cy={cy} r={4} fill={accent} stroke="var(--surface)" strokeWidth={2} />
                  ) : (
                    <g key={key} />
                  )
                }}
              />
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
