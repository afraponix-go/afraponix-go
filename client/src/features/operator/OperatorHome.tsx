import { Link } from 'react-router-dom'
import { useSystems } from '../systems/SystemContext'
import { ScanIcon } from '../../app/icons'
import '../plants/scan.css'
import './operator.css'

// The landing screen for an operator session (a real operator-level share, or
// an owner/admin previewing "View as operator"). Scan leads; "Today" is a task
// list once operating-programme tasks exist (Operator Access proposal, Phase 3
// — not built yet), so it's an honest empty state for now, not fake data.
export function OperatorHome() {
  const { activeSystem } = useSystems()

  return (
    <div className="op-wrap">
      <Link to="/scan" className="op-scan">
        <ScanIcon className="tab-icon" />
        Scan a label
      </Link>
      <p className="op-fallback">Can't scan? <Link to="/pick">Choose manually</Link></p>

      <div className="op-section">
        <div className="op-section-h"><h2 className="section-title">Today</h2></div>
        {activeSystem && <p className="op-hint">{activeSystem.system_name}</p>}
        <div className="op-today-empty">No tasks assigned yet — task lists are coming soon.</div>
      </div>

      <div className="op-section">
        <div className="op-section-h"><h2 className="section-title">Log</h2></div>
        <LogTiles />
      </div>
    </div>
  )
}

// Shared with LogHub so the home screen and the dedicated Log tab show the
// identical four shortcuts — reused, not two components to keep in sync.
export function LogTiles() {
  return (
    <div className="op-tiles">
      <Link to="/data/fish" className="op-tile">
        <span className="op-tile-icon" aria-hidden>🐟</span>
        <span className="op-tile-label">Feeding</span>
        <span className="op-tile-sub">Record what was fed</span>
      </Link>
      <Link to="/data" className="op-tile">
        <span className="op-tile-icon" aria-hidden>💧</span>
        <span className="op-tile-label">Water</span>
        <span className="op-tile-sub">Log a reading</span>
      </Link>
      <Link to="/plants/plantings" className="op-tile">
        <span className="op-tile-icon" aria-hidden>🌱</span>
        <span className="op-tile-label">Planting</span>
        <span className="op-tile-sub">Record a new planting</span>
      </Link>
      <Link to="/plants/harvest" className="op-tile">
        <span className="op-tile-icon" aria-hidden>🌾</span>
        <span className="op-tile-label">Harvest</span>
        <span className="op-tile-sub">Log a harvest</span>
      </Link>
    </div>
  )
}
