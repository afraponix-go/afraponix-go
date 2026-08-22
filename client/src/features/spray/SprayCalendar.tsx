import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchCalendar } from './api'
import { RecordModal, type RecordPrefill } from './RecordModal'
import './spray.css'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// 0=Mon..6=Sun for a given Y/M/D
function mondayIndex(year: number, month: number, day: number) {
  const js = new Date(year, month - 1, day).getDay() // 0=Sun
  return (js + 6) % 7
}

export function SprayCalendar() {
  const { activeId } = useSystems()
  const now = new Date()
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [record, setRecord] = useState<RecordPrefill | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['spray-calendar', activeId, ym.year, ym.month],
    queryFn: () => fetchCalendar(activeId as string, ym.year, ym.month),
    enabled: !!activeId,
  })

  if (!activeId) return <div className="empty">Select a system to see the spray calendar.</div>

  const daysInMonth = new Date(ym.year, ym.month, 0).getDate()
  const lead = mondayIndex(ym.year, ym.month, 1)
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const days = data?.days ?? {}
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const shift = (delta: number) => setYm((s) => {
    let m = s.month + delta, y = s.year
    if (m < 1) { m = 12; y-- } else if (m > 12) { m = 1; y++ }
    return { year: y, month: m }
  })

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Spray calendar</h2>
        <div className="cal-nav">
          <button className="row-btn" onClick={() => shift(-1)}>‹</button>
          <span className="cal-title">{MONTHS[ym.month - 1]} {ym.year}</span>
          <button className="row-btn" onClick={() => shift(1)}>›</button>
        </div>
      </div>
      <p className="spray-lead">Scheduled sprays from your active programmes. A filled dot means it's already been recorded.</p>

      {isLoading ? <div className="empty">Loading…</div> : (
        <div className="cal-grid">
          {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
          {cells.map((day, i) => {
            if (day == null) return <div key={`e${i}`} className="cal-cell empty-cell" />
            const date = `${ym.year}-${String(ym.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const items = days[date] ?? []
            return (
              <div key={date} className={`cal-cell ${date === todayStr ? 'today' : ''}`}>
                <div className="cal-daynum">{day}</div>
                <div className="cal-items">
                  {items.map((it, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`cal-item fish-${it.fish_safety} ${it.applied ? 'applied' : ''}`}
                      title={`${it.product_name} · ${it.plan_name}${it.applied ? ' · recorded' : ' · click to record'}`}
                      onClick={() => setRecord({ plan_id: it.plan_id, product_id: it.product_id, product_name: it.product_name, rate: it.rate, date })}
                    >
                      <span className="cal-dot" />{it.product_name}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {record && activeId && <RecordModal systemId={activeId} prefill={record} onClose={() => setRecord(null)} />}
    </div>
  )
}
