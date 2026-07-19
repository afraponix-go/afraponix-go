import { useEffect, useState } from 'react'
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
import type { SeriesPoint } from './api'
import './charts.css'

// Read a CSS custom property and keep it current across theme changes, so the
// chart's colors track light/dark like the rest of the app.
export function useCssVar(name: string, fallback: string) {
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

type Props = {
  series: SeriesPoint[]
  label: string
  unit: string
  min?: number
  max?: number
  isLoading?: boolean
  isError?: boolean
}

// Presentational time-series chart with a summary-stats header and a healthy-range
// band. Used both by the Charts page and the metric chart modal.
export function MetricChart({ series, label, unit, min, max, isLoading, isError }: Props) {
  const accent = useCssVar('--accent', '#1462a8')
  const green = useCssVar('--brand-green', '#4f9d3a')

  const values = series.map((p) => p.value)
  const latest = values.length ? values[values.length - 1] : null
  const lo = values.length ? Math.min(...values) : null
  const hi = values.length ? Math.max(...values) : null
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
  const fmt = (n: number | null) => (n == null ? '—' : n.toFixed(unit === '' ? 2 : 1))
  const lastIndex = series.length - 1

  return (
    <>
      <div className="metric-grid" style={{ marginBottom: 18 }}>
        <Stat label="Latest" value={fmt(latest)} unit={unit} />
        <Stat label="Average" value={fmt(avg)} unit={unit} />
        <Stat label="Min" value={fmt(lo)} unit={unit} />
        <Stat label="Max" value={fmt(hi)} unit={unit} />
      </div>

      <div className="chart-card">
        {isLoading ? (
          <div className="empty" style={{ border: 'none' }}>Loading…</div>
        ) : isError ? (
          <div className="empty" style={{ border: 'none' }}>Could not load chart data.</div>
        ) : series.length === 0 ? (
          <div className="empty" style={{ border: 'none' }}>No readings for {label} yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={series} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {(min != null || max != null) && (
                <ReferenceArea y1={min ?? undefined} y2={max ?? undefined} fill={green} fillOpacity={0.08} ifOverflow="extendDomain" />
              )}
              <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                cursor={{ stroke: accent, strokeWidth: 1, strokeDasharray: '3 3' }}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, boxShadow: 'var(--shadow)' }}
                labelStyle={{ color: 'var(--ink-faint)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--ink)' }}
                formatter={(v) => [`${v}${unit ? ' ' + unit : ''}`, label]}
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
        {(min != null || max != null) && series.length > 0 && (
          <div className="chart-legend">
            <span className="swatch" /> Healthy range
            {min != null && max != null ? ` ${min}–${max}` : max != null ? ` < ${max}` : ` > ${min}`}
            {unit ? ` ${unit}` : ''}
          </div>
        )}
      </div>
    </>
  )
}
