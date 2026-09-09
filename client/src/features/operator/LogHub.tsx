import { LogTiles } from './OperatorHome'
import './operator.css'

// The "Log" tab for an operator session — the four capture shortcuts, as
// their own destination (Today stays focused on the task list).
export function LogHub() {
  return (
    <div className="op-wrap">
      <h2 className="section-title" style={{ marginTop: 0 }}>Log</h2>
      <p className="op-hint">What would you like to record?</p>
      <LogTiles />
    </div>
  )
}
