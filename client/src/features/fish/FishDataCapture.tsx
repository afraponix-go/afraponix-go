import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory } from './api'
import { fetchFeedingLog } from './feeding'
import { BulkFeedingForm } from './BulkFeedingForm'
import { FeedingHistory } from './FeedingHistory'
import '../dashboard/dashboard.css'
import '../water/water.css'
import './fish.css'

export function FishDataCapture() {
  const { activeId } = useSystems()
  const [saved, setSaved] = useState(false)
  const { data: tanks = [] } = useQuery({ queryKey: ['fish-inventory', activeId], queryFn: () => fetchFishInventory(activeId as string), enabled: !!activeId })
  const { data: feedingLog = [] } = useQuery({ queryKey: ['feeding-log', activeId], queryFn: () => fetchFeedingLog(activeId as string), enabled: !!activeId })

  if (!activeId) return <div className="empty">Select a system to record fish data.</div>
  if (tanks.length === 0) return <div className="empty">No fish tanks configured yet.</div>

  return (
    <div>
      <h2 className="section-title" style={{ marginTop: 0 }}>Daily feeding — all tanks</h2>
      <p style={{ margin: '0 0 16px', color: 'var(--ink-faint)', fontSize: 14 }}>Quick entry for every tank at once, pre-filled from the last feeding and the recommended ration.</p>
      <div className="wq-form">
        {saved && <div className="wq-ok" style={{ marginBottom: 14 }}>Feeding saved ✓</div>}
        <BulkFeedingForm
          systemId={activeId}
          tanks={tanks}
          previousLog={feedingLog}
          onDone={() => {
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
          }}
        />
      </div>

      <FeedingHistory log={feedingLog} tanks={tanks} />
    </div>
  )
}
