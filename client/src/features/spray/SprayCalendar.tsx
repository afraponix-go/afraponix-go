import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchCalendar } from './api'
import { RecordModal, type RecordPrefill } from './RecordModal'
import { fetchDosingProgrammes, fetchDosingLog, nutrientShort, type DosingProgramme } from '../dosing/api'
import { DosingRecordModal } from '../dosing/DosingRecordModal'
import '../dosing/dosing.css'
import './spray.css'

type View = 'month' | 'week' | 'day'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WD = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] // JS getDay() order

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7))
const parse = (s: string) => new Date(s + 'T00:00:00')

// How many times a weekly schedule (these weekdays) has fired from start..date
// inclusive — used to stop a finite correction after its `doses` occurrences.
const occurrenceIndex = (startStr: string, dateStr: string, days: string[]): number => {
  const start = parse(startStr), date = parse(dateStr)
  let n = 0
  for (const wd of days) {
    const dow = WD.indexOf(wd)
    if (dow < 0) continue
    const first = new Date(start)
    first.setDate(first.getDate() + ((dow - start.getDay() + 7) % 7))
    if (first > date) continue
    n += Math.floor((date.getTime() - first.getTime()) / (7 * 86400000)) + 1
  }
  return n
}

// The recommended dose, compactly (g→kg / ml→L above 1000).
const fmtDose = (amt: number | null | undefined, unit: string | null | undefined): string | null => {
  if (amt == null) return null
  const u = unit || 'g'
  if ((u === 'g' || u === 'ml') && amt >= 1000) return `${(amt / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${u === 'g' ? 'kg' : 'L'}`
  return `${amt.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${u}`
}

type SprayItem = { plan_id: number; plan_name: string; product_id: number; product_name: string; category: string; fish_safety: string; rate: string | null; applied: boolean }

export function SprayCalendar() {
  const { activeId } = useSystems()
  const [view, setView] = useState<View>('month')
  const [focus, setFocus] = useState(new Date())
  const [record, setRecord] = useState<RecordPrefill | null>(null)
  const [dose, setDose] = useState<{ programme: DosingProgramme; itemId?: number; date: string } | null>(null)

  const todayStr = iso(new Date())

  // Visible date range for the current view.
  const range = useMemo(() => {
    if (view === 'day') return { start: focus, end: focus }
    if (view === 'week') { const s = mondayOf(focus); return { start: s, end: addDays(s, 6) } }
    return { start: new Date(focus.getFullYear(), focus.getMonth(), 1), end: new Date(focus.getFullYear(), focus.getMonth() + 1, 0) }
  }, [view, focus])

  // Spray calendar is month-keyed; fetch every month the range spans (1–2).
  const months = useMemo(() => {
    const m = new Map<string, { year: number; month: number }>()
    for (const d of [range.start, range.end]) m.set(`${d.getFullYear()}-${d.getMonth() + 1}`, { year: d.getFullYear(), month: d.getMonth() + 1 })
    return [...m.values()]
  }, [range])

  const sprayQs = useQueries({
    queries: months.map((m) => ({ queryKey: ['spray-calendar', activeId, m.year, m.month], queryFn: () => fetchCalendar(activeId as string, m.year, m.month), enabled: !!activeId })),
  })
  const { data: dosingProgrammes = [] } = useQuery({ queryKey: ['dosing-programmes', activeId], queryFn: () => fetchDosingProgrammes(activeId as string), enabled: !!activeId })
  const { data: dosingLog = [] } = useQuery({ queryKey: ['dosing-log', activeId], queryFn: () => fetchDosingLog(activeId as string), enabled: !!activeId })

  const sprayDays = useMemo(() => { const acc: Record<string, SprayItem[]> = {}; for (const q of sprayQs) if (q.data?.days) Object.assign(acc, q.data.days); return acc }, [sprayQs])
  const doseApplied = useMemo(() => new Set(dosingLog.filter((l) => l.item_id != null).map((l) => `${l.event_date}|${l.item_id}`)), [dosingLog])
  const activeDosing = useMemo(() => dosingProgrammes.filter((p) => p.status === 'active'), [dosingProgrammes])
  const loading = sprayQs.some((q) => q.isLoading)

  const dosingFor = (date: string) => {
    const wd = WD[parse(date).getDay()]
    const out: { programme: DosingProgramme; target: DosingProgramme['targets'][number]; applied: boolean }[] = []
    for (const p of activeDosing) {
      // A programme doesn't schedule before it starts (created / start date).
      const start = p.start_date ?? (p.created_at ? String(p.created_at).slice(0, 10) : null)
      if (start && date < start) continue
      for (const t of p.targets) {
        if (!t.days.includes(wd)) continue
        // A finite correction stops once it has reached target (doses fired).
        if (t.doses != null && start && occurrenceIndex(start, date, t.days) > t.doses) continue
        out.push({ programme: p, target: t, applied: doseApplied.has(`${date}|${t.id}`) })
      }
    }
    return out
  }

  if (!activeId) return <div className="empty">Select a system to see the calendar.</div>

  const shift = (dir: number) => setFocus((f) => (view === 'day' ? addDays(f, dir) : view === 'week' ? addDays(f, dir * 7) : new Date(f.getFullYear(), f.getMonth() + dir, 1)))

  const title = view === 'month'
    ? `${MONTHS[focus.getMonth()]} ${focus.getFullYear()}`
    : view === 'week'
      ? `${range.start.getDate()} ${MONTHS[range.start.getMonth()]} – ${range.end.getDate()} ${MONTHS[range.end.getMonth()]}`
      : `${DOW[(focus.getDay() + 6) % 7]} ${focus.getDate()} ${MONTHS[focus.getMonth()]} ${focus.getFullYear()}`

  // One occurrence button (spray or dosing).
  const occ = (date: string) => (
    <>
      {(sprayDays[date] ?? []).map((it, i) => (
        <button key={`s${i}`} type="button" className={`cal-item fish-${it.fish_safety} ${it.applied ? 'applied' : ''}`}
          title={`${it.product_name} · ${it.plan_name}${it.applied ? ' · recorded' : ' · click to record'}`}
          onClick={() => setRecord({ plan_id: it.plan_id, product_id: it.product_id, product_name: it.product_name, rate: it.rate, date })}>
          <span className="cal-dot" />{it.product_name}
        </button>
      ))}
      {dosingFor(date).map((d, i) => {
        const dose = fmtDose(d.target.dose_amount, d.target.dose_unit)
        return (
          <button key={`d${i}`} type="button" className={`cal-item dosing ${d.applied ? 'applied' : ''}`}
            title={`${nutrientShort(d.target.nutrient)} → ${d.target.target_value ?? '—'} ppm${dose ? ` · dose ${dose}` : ''}${d.target.product ? ` · ${d.target.product}` : ''} · ${d.programme.name}${d.applied ? ' · dosed' : ' · click to record'}`}
            onClick={() => setDose({ programme: d.programme, itemId: d.target.id, date })}>
            <span className="cal-dot" />{nutrientShort(d.target.nutrient)} · {dose ?? d.target.product ?? d.programme.name}
          </button>
        )
      })}
    </>
  )

  // Month grid with a Monday-lead offset.
  const monthGrid = () => {
    const dim = new Date(focus.getFullYear(), focus.getMonth() + 1, 0).getDate()
    const lead = (new Date(focus.getFullYear(), focus.getMonth(), 1).getDay() + 6) % 7
    const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)]
    return (
      <div className="cal-grid">
        {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((day, i) => {
          if (day == null) return <div key={`e${i}`} className="cal-cell empty-cell" />
          const date = iso(new Date(focus.getFullYear(), focus.getMonth(), day))
          return (
            <div key={date} className={`cal-cell ${date === todayStr ? 'today' : ''}`}>
              <div className="cal-daynum">{day}</div>
              <div className="cal-items">{occ(date)}</div>
            </div>
          )
        })}
      </div>
    )
  }

  const weekGrid = () => (
    <div className="cal-grid">
      {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
      {Array.from({ length: 7 }, (_, i) => addDays(range.start, i)).map((d) => {
        const date = iso(d)
        return (
          <div key={date} className={`cal-cell cal-cell-week ${date === todayStr ? 'today' : ''}`}>
            <div className="cal-daynum">{d.getDate()} {MONTHS[d.getMonth()]}</div>
            <div className="cal-items">{occ(date)}</div>
          </div>
        )
      })}
    </div>
  )

  const dayView = () => {
    const date = iso(focus)
    const sprays = sprayDays[date] ?? []
    const doses = dosingFor(date)
    if (sprays.length === 0 && doses.length === 0) return <div className="empty">Nothing scheduled for this day.</div>
    return <div className="cal-day"><div className="cal-items">{occ(date)}</div></div>
  }

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Calendar</h2>
        <div className="cal-controls">
          <div className="seg cal-viewseg" role="tablist" aria-label="Calendar view">
            {(['day', 'week', 'month'] as View[]).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} className={`seg-btn${view === v ? ' active' : ''}`} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
          <div className="cal-nav">
            <button className="row-btn" onClick={() => shift(-1)} aria-label="Previous">‹</button>
            <span className="cal-title">{title}</span>
            <button className="row-btn" onClick={() => shift(1)} aria-label="Next">›</button>
          </div>
        </div>
      </div>
      <p className="spray-lead">Scheduled sprays and doses from your active programmes. A filled dot means it's already been recorded.</p>

      {loading ? <div className="empty">Loading…</div> : view === 'month' ? monthGrid() : view === 'week' ? weekGrid() : dayView()}

      {record && activeId && <RecordModal systemId={activeId} prefill={record} onClose={() => setRecord(null)} />}
      {dose && activeId && <DosingRecordModal systemId={activeId} programme={dose.programme} initialItemId={dose.itemId} initialDate={dose.date} onClose={() => setDose(null)} />}
    </div>
  )
}
