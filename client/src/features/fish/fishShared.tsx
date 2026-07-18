import type { ReactNode } from 'react'
import type { FishTank } from './api'
import type { FeedingRecord } from './feeding'

export function sum(tanks: FishTank[], key: keyof FishTank) {
  return tanks.reduce((acc, t) => acc + (typeof t[key] === 'number' ? (t[key] as number) : 0), 0)
}

export function fmt(n: number | null | undefined, digits = 0) {
  return n == null || !Number.isFinite(n) ? '—' : n.toFixed(digits)
}

export function timeAgo(ms: number): string {
  const mins = Math.round((Date.now() - ms) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

// Feed totals for this vs last calendar month, from the feeding log.
export function monthlyFeed(log: FeedingRecord[]) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const lastM = new Date(y, m - 1, 1)
  let thisMonth = 0
  let lastMonth = 0
  let lastFedMs = 0
  for (const r of log) {
    if (r.feed_consumption == null) continue
    const stamp = r.created_at ?? r.date
    if (stamp) lastFedMs = Math.max(lastFedMs, new Date(stamp).getTime())
    if (!r.date) continue
    const d = new Date(r.date)
    if (d.getFullYear() === y && d.getMonth() === m) thisMonth += r.feed_consumption
    else if (d.getFullYear() === lastM.getFullYear() && d.getMonth() === lastM.getMonth()) lastMonth += r.feed_consumption
  }
  const trend = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null
  return { thisMonth, lastMonth, trend, lastFedMs }
}

export function feedLabel(g: number): { value: string; unit: string } {
  return g >= 1000 ? { value: (g / 1000).toFixed(1), unit: 'kg' } : { value: String(Math.round(g)), unit: 'g' }
}

export function Stat({ label, value, unit, sub, children }: { label: string; value: string; unit?: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {children}
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
