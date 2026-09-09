import type { System } from '../systems/api'

// A plain system dropdown for the simple capture forms — only shown when
// there's more than one system to choose between (no point in a picker for
// the common single-system case). Unlike SystemPills, there's no "all
// systems" option: these forms always target exactly one system.
export function CaptureSystemSwitch({ systems, systemId, onChange }: { systems: System[]; systemId: string | null; onChange: (id: string) => void }) {
  if (systems.length <= 1) return null
  return (
    <div className="field" style={{ marginBottom: 16 }}>
      <label htmlFor="capture-system">System</label>
      <select id="capture-system" value={systemId ?? ''} onChange={(e) => onChange(e.target.value)}>
        {systems.map((s) => <option key={s.id} value={s.id}>{s.system_name}</option>)}
      </select>
    </div>
  )
}
