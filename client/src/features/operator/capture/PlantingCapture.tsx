import { Link, useNavigate } from 'react-router-dom'
import { PlantingForm } from '../../plants/PlantingForm'
import { useCaptureSystem } from '../useCaptureSystem'
import { CaptureSystemSwitch } from '../CaptureSystemSwitch'
import '../../plants/scan.css'

// The operator's Planting tile: just the "record a planting" form — the same
// one the admin Plantings page opens as a modal (PlantingForm), reused here
// as the whole page instead of the full batch list it normally sits behind.
export function PlantingCapture() {
  const navigate = useNavigate()
  const { systems, systemId, setActiveId } = useCaptureSystem()

  return (
    <div className="scan-wrap">
      <div className="scan-topline"><Link to="/log" className="link-btn">‹ Back to Log</Link></div>
      <h2 className="section-title" style={{ marginTop: 0 }}>New planting</h2>

      <CaptureSystemSwitch systems={systems} systemId={systemId} onChange={setActiveId} />

      {!systemId ? (
        <div className="empty">No system to plant into.</div>
      ) : (
        <PlantingForm onDone={() => navigate('/log')} />
      )}
    </div>
  )
}
