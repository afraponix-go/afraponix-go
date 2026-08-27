import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import type { System } from '../systems/api'
import { fetchProgrammes, fetchDue } from './api'
import { fetchDosingProgrammes, fetchDosingLog, type DosingProgramme } from '../dosing/api'
import '../systems/farmview.css'
import './spray.css'

const WD = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] // JS getDay() order
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parse = (s: string) => new Date(s + 'T00:00:00')

// How many times a weekly schedule (these weekdays) has fired from start..date.
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

// Dosing targets scheduled for `date` from a programme's active schedule.
const dosingDue = (programmes: DosingProgramme[], date: string) => {
  const wd = WD[parse(date).getDay()]
  const out: { id: number | undefined }[] = []
  for (const p of programmes) {
    if (p.status !== 'active') continue
    const start = p.start_date ?? (p.created_at ? String(p.created_at).slice(0, 10) : null)
    if (start && date < start) continue
    for (const t of p.targets) {
      if (!t.days.includes(wd)) continue
      if (t.doses != null && start && occurrenceIndex(start, date, t.days) > t.doses) continue
      out.push({ id: t.id })
    }
  }
  return out
}

// Farm rollup of the Operations calendar: a card per system listing its active
// programmes and how much is due today. Click a card to zoom into that system's
// full calendar, where individual doses and sprays are recorded.
export function OperationsCalendarFarm() {
  const { systems, setActiveId, activeFarm } = useSystems()
  const ordered = [...systems].sort((a, b) => a.system_name.localeCompare(b.system_name, undefined, { numeric: true }))

  return (
    <div className="fm">
      <div className="fm-bar">
        <div className="fm-bar-title">
          <span className="fm-eyebrow">All systems</span>
          <b>{activeFarm?.name ?? 'Farm'}</b>
        </div>
        <span className="fm-loading">Click a system to record its doses and sprays</span>
      </div>

      {ordered.length === 0 && <div className="empty">No systems in this farm yet.</div>}

      <div className="ops-farm-grid">
        {ordered.map((s) => (
          <SystemOpsCard key={s.id} system={s} onOpen={() => setActiveId(s.id)} />
        ))}
      </div>
    </div>
  )
}

function SystemOpsCard({ system, onOpen }: { system: System; onOpen: () => void }) {
  const todayStr = iso(new Date())
  const { data: sprayProgrammes = [], isLoading: l1 } = useQuery({ queryKey: ['spray-programmes', system.id], queryFn: () => fetchProgrammes(system.id) })
  const { data: dosingProgrammes = [], isLoading: l2 } = useQuery({ queryKey: ['dosing-programmes', system.id], queryFn: () => fetchDosingProgrammes(system.id) })
  const { data: dueData } = useQuery({ queryKey: ['spray-due', system.id], queryFn: () => fetchDue(system.id) })
  const { data: dosingLog = [] } = useQuery({ queryKey: ['dosing-log', system.id], queryFn: () => fetchDosingLog(system.id) })

  const activeSpray = sprayProgrammes.filter((p) => p.status === 'active')
  const activeDosing = dosingProgrammes.filter((p) => p.status === 'active')

  const sprayDue = (dueData?.due ?? []).filter((d) => !d.done).length
  const doseApplied = new Set(dosingLog.filter((l) => l.item_id != null).map((l) => `${l.event_date}|${l.item_id}`))
  const doseDue = dosingDue(activeDosing, todayStr).filter((t) => !doseApplied.has(`${todayStr}|${t.id}`)).length
  const dueToday = sprayDue + doseDue

  const loading = l1 || l2
  const empty = !loading && activeSpray.length === 0 && activeDosing.length === 0

  return (
    <button type="button" className="ops-farm-card" onClick={onOpen} aria-label={`Open ${system.system_name} operations`}>
      <div className="ops-farm-head">
        <span className="ops-farm-name">{system.system_name}</span>
        <span className="ops-farm-open">Open ↗</span>
      </div>

      {dueToday > 0 && <span className="ops-farm-due">{dueToday} due today</span>}

      {loading ? (
        <span className="ops-farm-muted">Loading…</span>
      ) : empty ? (
        <span className="ops-farm-muted">No active programmes</span>
      ) : (
        <ul className="ops-farm-list">
          {activeDosing.map((p) => (
            <li key={`d${p.id}`}><span className="ops-farm-kind dosing">Dosing</span> {p.name}</li>
          ))}
          {activeSpray.map((p) => (
            <li key={`s${p.id}`}><span className="ops-farm-kind spray">Spray</span> {p.name}</li>
          ))}
        </ul>
      )}
    </button>
  )
}
