import { Link } from 'react-router-dom'
import { useSystems } from '../systems/SystemContext'
import { ScanIcon, FishIcon, ScaleIcon, WaterDropIcon, SeedIcon, TransplantIcon, PlantIcon, HarvestIcon } from '../../app/icons'
import '../plants/scan.css'
import './operator.css'

// The landing screen for an operator session (a real operator-level share, or
// an owner/admin previewing "View as operator"). Scan leads; "Today" is a task
// list once operating-programme tasks exist (Operator Access proposal, Phase 3
// — not built yet), so it's an honest empty state for now, not fake data. Log
// has its own tab (LogHub) — it doesn't repeat here too.
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
