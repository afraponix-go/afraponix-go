import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory } from './api'
import { fetchFeedingLog } from './feeding'
import { FeedingModal } from './FeedingModal'
import { fmt, monthlyFeed, feedLabel, timeAgo, Stat } from './fishShared'
import '../dashboard/dashboard.css'
import '../water/water.css'
import './fish.css'

const PREVIEW = 8

export function FishHealth() {
  const { activeId } = useSystems()
  const [showFeeding, setShowFeeding] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const { data: tanks = [] } = useQuery({ queryKey: ['fish-inventory', activeId], queryFn: () => fetchFishInventory(activeId as string), enabled: !!activeId })
  const { data: feedingLog = [] } = useQuery({ queryKey: ['feeding-log', activeId], queryFn: () => fetchFeedingLog(activeId as string), enabled: !!activeId })

  if (!activeId) return <div className="empty">Select a system to see fish health.</div>

  const { thisMonth, lastFedMs } = monthlyFeed(feedingLog)
  const feed = feedLabel(thisMonth)
  const shown = expanded ? feedingLog : feedingLog.slice(0, PREVIEW)

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Fish Health</h2>
        <button className="btn feed-btn" onClick={() => setShowFeeding(true)} disabled={tanks.length === 0}>+ Log feeding</button>
      </div>

      <div className="metric-grid" style={{ marginBottom: 8 }}>
        <Stat label="Feed This Month" value={feed.value} unit={feed.unit} />
        <Stat label="Last Fed" value={lastFedMs ? timeAgo(lastFedMs) : '—'} />
        <Stat label="Feeding Records" value={String(feedingLog.length)} />
      </div>

      <h2 className="section-title">Feeding history</h2>
      {feedingLog.length === 0 ? (
        <div className="empty">No feeding logged yet.</div>
      ) : (
        <div className="wq-table-wrap">
          <table className="wq-table op-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Tank</th>
                <th>Feed (g)</th>
                <th>Type</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => {
                const tankNo = tanks.find((t) => t.fish_tank_id === r.fish_tank_id)?.tank_number
                return (
                  <tr key={r.id ?? i}>
                    <td>{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                    <td>{tankNo != null ? `Tank ${tankNo}` : `#${r.fish_tank_id ?? '—'}`}</td>
                    <td>{fmt(r.feed_consumption, 1)}</td>
                    <td className="op-text">{r.feed_type || '—'}</td>
                    <td className="op-text">{r.notes || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {feedingLog.length > PREVIEW && (
            <button className="feed-expand" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Show less' : `Show all ${feedingLog.length} entries`}
            </button>
          )}
        </div>
      )}

      {showFeeding && activeId && tanks.length > 0 && (
        <FeedingModal systemId={activeId} tanks={tanks} previousLog={feedingLog} onClose={() => setShowFeeding(false)} />
      )}
    </div>
  )
}
