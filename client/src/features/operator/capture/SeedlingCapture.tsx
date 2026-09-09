import { Link, useNavigate } from 'react-router-dom'
import { useSystems, SHARED_FARM_ID } from '../../systems/SystemContext'
import { SeedlingSowForm } from '../../seedlings/SeedlingSowForm'
import '../../plants/scan.css'

// The operator's Sow tile: just the "sow a batch" form — the same one the
// admin Seedlings page opens as a modal (SeedlingSowForm), reused here as
// the whole page. Sowing goes into the farm's one nursery, not a specific
// system, so there's no system switcher here (unlike Feeding/Water/Planting).
export function SeedlingCapture() {
  const navigate = useNavigate()
  const { activeFarmId, systems } = useSystems()
  // The synthetic "Shared with me" bucket isn't a real farm — there's no
  // nursery to sow into there.
  const farmId = activeFarmId && activeFarmId !== SHARED_FARM_ID ? activeFarmId : null

  return (
    <div className="scan-wrap">
      <div className="scan-topline"><Link to="/log" className="link-btn">‹ Back to Log</Link></div>
      <h2 className="section-title" style={{ marginTop: 0 }}>Sow seedlings</h2>

      {!farmId ? (
        <div className="empty">No farm to sow into.</div>
      ) : (
        <SeedlingSowForm farmId={farmId} systemId={systems[0]?.id} onDone={() => navigate('/log')} />
      )}
    </div>
  )
}
