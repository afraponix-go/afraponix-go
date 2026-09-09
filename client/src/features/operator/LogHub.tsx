import { LogTiles } from './OperatorHome'
import './operator.css'

// The "Log" tab for an operator session — the same four capture shortcuts
// shown on the operator home, as their own destination.
export function LogHub() {
  return (
    <div className="op-wrap">
      <h2 className="section-title" style={{ marginTop: 0 }}>Log</h2>
      <p className="op-hint">What would you like to record?</p>
      <LogTiles />
    </div>
  )
}
