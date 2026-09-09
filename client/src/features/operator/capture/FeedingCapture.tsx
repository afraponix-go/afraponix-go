import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchFishInventory } from '../../fish/api'
import { fetchFeedingLog } from '../../fish/feeding'
import { BulkFeedingForm } from '../../fish/BulkFeedingForm'
import { useCaptureSystem } from '../useCaptureSystem'
import { CaptureSystemSwitch } from '../CaptureSystemSwitch'
import '../../water/water.css'
import '../../plants/scan.css'

// The operator's Feeding tile: just the daily-feeding form, no history table
// and no admin sub-tabs — the same form the full Fish → Data Capture page
// uses (BulkFeedingForm), reused as-is per the Operator Access proposal.
export function FeedingCapture() {
  const navigate = useNavigate()
  const { systems, systemId, setActiveId } = useCaptureSystem()
  const [saved, setSaved] = useState(false)
  const { data: tanks = [] } = useQuery({ queryKey: ['fish-inventory', systemId], queryFn: () => fetchFishInventory(systemId as string), enabled: !!systemId })
  const { data: feedingLog = [] } = useQuery({ queryKey: ['feeding-log', systemId], queryFn: () => fetchFeedingLog(systemId as string), enabled: !!systemId })

  // Multiple systems in this farm: cycle through them in name order, wrapping
  // back to the first — a lap through every system in one sitting.
  function goNextSystem() {
    const ordered = systems.slice().sort((a, b) => a.system_name.localeCompare(b.system_name, undefined, { numeric: true }))
    const idx = ordered.findIndex((s) => s.id === systemId)
    const next = ordered[(idx + 1) % ordered.length]
    if (next) setActiveId(next.id)
  }

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="scan-wrap">
      <div className="scan-topline"><Link to="/log" className="link-btn">‹ Back to Log</Link></div>
      <h2 className="section-title" style={{ marginTop: 0 }}>Feeding</h2>

      <CaptureSystemSwitch systems={systems} systemId={systemId} onChange={setActiveId} />

      {!systemId ? (
        <div className="empty">No system to log feeding for.</div>
      ) : tanks.length === 0 ? (
        <div className="empty">No fish tanks configured yet.</div>
      ) : (
        <div className="wq-form">
          {saved && <div className="wq-ok" style={{ marginBottom: 14 }}>Feeding saved ✓</div>}
          <BulkFeedingForm
            systemId={systemId}
            tanks={tanks}
            previousLog={feedingLog}
            onDone={() => navigate('/log')}
            onSaveAndNext={systems.length > 1 ? () => { flash(); goNextSystem() } : undefined}
          />
        </div>
      )}
    </div>
  )
}
