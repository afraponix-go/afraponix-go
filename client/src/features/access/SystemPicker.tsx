import './access.css'

export type PickableSystem = { id: string; name: string }

// "Which systems can they use?" — the farm is shared; this narrows it. `value`
// null = every system (including any added later); an array = only those.
export function SystemPicker({ systems, canShareAll = true, value, onChange }: {
  systems: PickableSystem[]
  canShareAll?: boolean
  value: string[] | null
  onChange: (v: string[] | null) => void
}) {
  const all = value === null
  const chosen = new Set(value ?? [])
  const toggle = (id: string) => {
    const next = new Set(chosen)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }
  return (
    <div className="sp">
      {canShareAll && (
        <label className="sp-row sp-all">
          <input type="checkbox" checked={all} onChange={(e) => onChange(e.target.checked ? null : systems.map((s) => s.id))} />
          <span>All systems <small>including any added later</small></span>
        </label>
      )}
      {!all && (
        <div className="sp-list">
          {systems.length === 0 && <div className="ar-hint">This farm has no systems yet.</div>}
          {systems.map((s) => (
            <label key={s.id} className="sp-row">
              <input type="checkbox" checked={chosen.has(s.id)} onChange={() => toggle(s.id)} />
              <span>{s.name}</span>
            </label>
          ))}
          {systems.length > 0 && chosen.size === 0 && <div className="ar-hint" style={{ color: 'var(--danger, #b3261e)' }}>Choose at least one system.</div>}
        </div>
      )}
    </div>
  )
}

// "All systems" / "2 of 4 systems" for a share row.
export function selectionLabel(allSystems: boolean | undefined, systemIds: string[] | undefined, total: number): string {
  if (allSystems !== false) return 'All systems'
  const n = systemIds?.length ?? 0
  return `${n} of ${total} system${total === 1 ? '' : 's'}`
}
