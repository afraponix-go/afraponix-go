import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCaptureSystem } from './useCaptureSystem'
import { CaptureSystemSwitch } from './CaptureSystemSwitch'
import { fetchOperatingDue, logOperatingTask, undoOperatingLog, type DueTask } from '../operating/api'
import { ScanIcon, FishIcon, ScaleIcon, WaterDropIcon, SeedIcon, TransplantIcon, PlantIcon, HarvestIcon, CheckIcon, SkipIcon, UndoIcon } from '../../app/icons'
import '../plants/scan.css'
import './operator.css'

// The landing screen for an operator session (a real operator-level share, or
// an owner/admin previewing "View as operator"). Scan leads; Today is the
// operating-programme task list (Operator Access proposal, Phase 3) — what's
// scheduled for today on the active system, with one-tap done/skip. Log has
// its own tab (LogHub) — it doesn't repeat here too.
export function OperatorHome() {
  const { systems, systemId, setActiveId } = useCaptureSystem()

  return (
    <div className="op-wrap">
      <Link to="/scan" className="op-scan">
        <ScanIcon className="tab-icon" />
        Scan a label
      </Link>
      <p className="op-fallback">Can't scan? <Link to="/pick">Choose manually</Link></p>

      <div className="op-section">
        <div className="op-section-h"><h2 className="section-title">Today</h2></div>
        <CaptureSystemSwitch systems={systems} systemId={systemId} onChange={setActiveId} />
        {systemId ? <TodayTasks systemId={systemId} /> : <div className="op-today-empty">No system to show tasks for.</div>}
      </div>
    </div>
  )
}

function TodayTasks({ systemId }: { systemId: string }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['operating-due', systemId], queryFn: () => fetchOperatingDue(systemId) })
  const due = data?.due ?? []

  const refresh = () => qc.invalidateQueries({ queryKey: ['operating-due', systemId] })
  const log = useMutation({
    mutationFn: ({ itemId, status }: { itemId: number; status: 'done' | 'skipped' }) => logOperatingTask(systemId, itemId, status),
    onSuccess: refresh,
  })
  const undo = useMutation({
    mutationFn: (logId: number) => undoOperatingLog(logId),
    onSuccess: refresh,
  })

  if (isLoading) return <div className="op-today-empty">Loading…</div>
  if (due.length === 0) return <div className="op-today-empty">Nothing scheduled for today.</div>

  return (
    <div className="op-task-list">
      {due.map((t) => <TaskRow key={t.item_id} task={t} busy={log.isPending || undo.isPending} onLog={(status) => log.mutate({ itemId: t.item_id, status })} onUndo={() => t.log_id != null && undo.mutate(t.log_id)} />)}
    </div>
  )
}

function TaskRow({ task, busy, onLog, onUndo }: { task: DueTask; busy: boolean; onLog: (status: 'done' | 'skipped') => void; onUndo: () => void }) {
  return (
    <div className={`op-task-row${task.status !== 'open' ? ` ${task.status}` : ''}`}>
      <div className="op-task-main">
        <span className="op-task-label">{task.label}</span>
        <span className="op-task-sub">
          {task.status === 'done' ? `Done${task.operator_name ? ` · ${task.operator_name}` : ''}` : task.status === 'skipped' ? `Skipped${task.operator_name ? ` · ${task.operator_name}` : ''}` : task.est_minutes != null ? `~${task.est_minutes} min` : task.programme_name}
        </span>
      </div>
      {task.status === 'open' ? (
        <div className="op-task-actions">
          <button type="button" className="op-task-btn skip" disabled={busy} onClick={() => onLog('skipped')} aria-label="Skip">
            <SkipIcon />
          </button>
          <button type="button" className="op-task-btn done" disabled={busy} onClick={() => onLog('done')} aria-label="Mark done">
            <CheckIcon />
          </button>
        </div>
      ) : (
        <button type="button" className="op-task-undo" disabled={busy} onClick={onUndo}>
          <UndoIcon /> Undo
        </button>
      )}
    </div>
  )
}

// Shared with LogHub so the home screen and the dedicated Log tab show the
// identical shortcuts — reused, not two components to keep in sync. Each
// tile is either a direct, single-purpose form (Feeding, Water, Planting) or,
// where the action needs an existing tank/batch first (weighing, mortality,
// tank harvest, plant harvest), the manual picker pre-scoped to the right
// kind — the same minimal action sheet a scan lands on, not an admin page.
export function LogTiles() {
  return (
    <div className="op-tiles">
      <Link to="/log/feeding" className="op-tile">
        <FishIcon className="op-tile-icon" />
        <span className="op-tile-label">Feeding</span>
        <span className="op-tile-sub">Record what was fed</span>
      </Link>
      <Link to="/pick?kind=fish" className="op-tile">
        <ScaleIcon className="op-tile-icon" />
        <span className="op-tile-label">Fish tank</span>
        <span className="op-tile-sub">Weigh, mortality, harvest</span>
      </Link>
      <Link to="/log/water" className="op-tile">
        <WaterDropIcon className="op-tile-icon" />
        <span className="op-tile-label">Water</span>
        <span className="op-tile-sub">Log a reading</span>
      </Link>
      <Link to="/log/seedling" className="op-tile">
        <SeedIcon className="op-tile-icon" />
        <span className="op-tile-label">Sow seedlings</span>
        <span className="op-tile-sub">Start a nursery batch</span>
      </Link>
      <Link to="/pick?kind=seedling" className="op-tile">
        <TransplantIcon className="op-tile-icon" />
        <span className="op-tile-label">Transplant</span>
        <span className="op-tile-sub">Move seedlings to a bed</span>
      </Link>
      <Link to="/log/planting" className="op-tile">
        <PlantIcon className="op-tile-icon" />
        <span className="op-tile-label">Planting</span>
        <span className="op-tile-sub">Record a new planting</span>
      </Link>
      <Link to="/pick?kind=bed" className="op-tile">
        <HarvestIcon className="op-tile-icon" />
        <span className="op-tile-label">Harvest</span>
        <span className="op-tile-sub">Log a plant harvest</span>
      </Link>
    </div>
  )
}
