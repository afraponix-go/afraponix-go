import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { useSystems } from '../systems/SystemContext'
import { fetchDensityHistory, fetchFishInventory, tankMaxDensity } from './api'
import { Stat } from './fishShared'
import '../dashboard/dashboard.css'
import '../charts/charts.css'
import './fish.css'

// Keep a CSS custom property current across theme changes so chart colors
// track light/dark like the rest of the app.
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

const WINDOWS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '6m', days: 180 },
  { label: '1y', days: 365 },
]

function shortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function FishDensity() {
  const { activeId } = useSystems()
  const [days, setDays] = useState(90)
  const accent = useCssVar('--accent', '#1462a8')
  const green = useCssVar('--brand-green', '#4f9d3a')

  const { data: tanks = [] } = useQuery({
    queryKey: ['fish-inventory', activeId],
    queryFn: () => fetchFishInventory(activeId as string),
    enabled: !!activeId,
  })
  const { data: series = [], isLoading, isError } = useQuery({
    queryKey: ['density-history', activeId, days],
    queryFn: () => fetchDensityHistory(activeId as string, days),
    enabled: !!activeId,
  })

  if (!activeId) return <div className="empty">Select a system to see density trends.</div>

  const systemMax = tanks.length ? Math.max(...tanks.map((t) => tankMaxDensity(t))) : 30
  const data = series.map((p) => ({ ...p, label: shortDate(p.date) }))
  const values = series.map((p) => p.density)
  const latest = values.length ? values[values.length - 1] : null
  const peak = values.length ? Math.max(...values) : null
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
  const fmt = (n: number | null) => (n == null ? '—' : n.toFixed(2))
  const lastIndex = series.length - 1

  // Only pin the Y-axis to the recommended max when the stock is actually
  // approaching it; otherwise scale to the data so the trend stays readable.
  const dataMax = peak ?? 0
  const showMaxLine = dataMax >= systemMax * 0.5
  const yMax = showMaxLine ? Math.ceil(systemMax * 1.1) : Math.max(1, Math.ceil(dataMax * 1.3))

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Average density over time</h2>
        <div className="seg" role="tablist" aria-label="Time range">
          {WINDOWS.map((w) => (
            <button key={w.days} className={`seg-btn ${days === w.days ? 'active' : ''}`} onClick={() => setDays(w.days)}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="metric-grid" style={{ marginBottom: 18 }}>
        <Stat label="Current" value={fmt(latest)} unit="kg/m³" />
        <Stat label="Average" value={fmt(avg)} unit="kg/m³" />
        <Stat label="Peak" value={fmt(peak)} unit="kg/m³" />
        <Stat label="Recommended Max" value={String(systemMax)} unit="kg/m³" />
      </div>

      <div className="chart-card">
        {isLoading ? (
          <div className="empty" style={{ border: 'none' }}>Loading…</div>
        ) : isError ? (
          <div className="empty" style={{ border: 'none' }}>Could not load density history.</div>
        ) : series.length === 0 ? (
          <div className="empty" style={{ border: 'none' }}>No fish data to chart yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="densFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={28} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} width={40} domain={[0, yMax]} allowDecimals />
              <Tooltip
                cursor={{ stroke: accent, strokeWidth: 1, strokeDasharray: '3 3' }}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, boxShadow: 'var(--shadow)' }}
                labelStyle={{ color: 'var(--ink-faint)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--ink)' }}
                formatter={(v) => [`${Number(v).toFixed(2)} kg/m³`, 'Avg density']}
              />
              {showMaxLine && (
                <ReferenceLine y={systemMax} stroke={green} strokeDasharray="4 4" label={{ value: `max ${systemMax}`, position: 'insideTopRight', fill: 'var(--ink-faint)', fontSize: 11 }} />
              )}
              <Area
                type="monotone"
                dataKey="density"
                stroke={accent}
                strokeWidth={2}
                fill="url(#densFill)"
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
        {series.length > 0 && (
          showMaxLine ? (
            <div className="chart-legend">
              <span className="swatch" style={{ background: green }} /> Recommended max {systemMax} kg/m³
            </div>
          ) : (
            <div className="chart-legend">Peak {fmt(peak)} kg/m³ — well below the {systemMax} kg/m³ recommended max</div>
          )
        )}
      </div>
      <p style={{ color: 'var(--ink-faint)', fontSize: 13, marginTop: 14 }}>
        Reconstructed from stocking, mortality, moves and harvests logged for each tank. Density = total biomass ÷ total tank volume.
      </p>
    </div>
  )
}
