import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSettingsSystem } from './settingsSystem'
import { updateTrackedMetrics, isOwnedSystem } from '../systems/api'
import { WATER_FIELDS, parseTrackedMetrics } from '../water/api'
import { ApiError } from '../../lib/apiClient'
import '../fish/fish.css'
import '../dashboard/dashboard.css'
import './settings.css'

export function MetricsSettings() {
  const { systemId: activeId, system: activeSystem } = useSettingsSystem()
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seed from the active system's stored selection (or all).
  useEffect(() => {
    setSelected(parseTrackedMetrics(activeSystem?.tracked_metrics))
  }, [activeSystem])

  const owner = isOwnedSystem(activeSystem)

  const mutation = useMutation({
    mutationFn: () => updateTrackedMetrics(activeId as string, [...selected]),
    onSuccess: () => {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['systems'] })
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not save your metrics.'),
  })

  function toggle(key: string) {
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (!activeId) return <div className="empty">No systems in this farm yet.</div>

  const allOn = selected.size === WATER_FIELDS.length
  const setAll = (on: boolean) => setSelected(on ? new Set(WATER_FIELDS.map((f) => f.key)) : new Set())

  return (
    <div className="set-card">
      <h2 className="set-title">Tracked metrics</h2>
      <p className="set-sub">
        {owner
          ? 'Choose which water and nutrient parameters this system tracks. Unselected metrics are hidden from the dashboard and the water-quality capture form.'
          : 'This system was shared with you. Only its owner can change which metrics are tracked.'}
      </p>

      {error && <div className="set-error">{error}</div>}
      {saved && <div className="set-ok">Saved ✓</div>}

      {owner && (
        <div className="metrics-bulk">
          <button type="button" className="metrics-link" onClick={() => setAll(true)} disabled={allOn}>Select all</button>
          <span aria-hidden>·</span>
          <button type="button" className="metrics-link" onClick={() => setAll(false)} disabled={selected.size === 0}>Clear all</button>
        </div>
      )}

      <div className="metrics-grid">
        {WATER_FIELDS.map((f) => {
          const on = selected.has(f.key)
          return (
            <label key={f.key} className={`metric-toggle${on ? ' on' : ''}${owner ? '' : ' locked'}`}>
              <input
                type="checkbox"
                checked={on}
                disabled={!owner}
                onChange={() => toggle(f.key)}
              />
              <span className="metric-toggle-label">
                {f.label}
                {f.unit && <span className="metric-toggle-unit"> ({f.unit})</span>}
              </span>
            </label>
          )
        })}
      </div>

      {owner && (
        <div className="mform-actions">
          <button className="btn" type="button" disabled={mutation.isPending} onClick={() => { setError(null); mutation.mutate() }}>
            {mutation.isPending ? 'Saving…' : 'Save metrics'}
          </button>
        </div>
      )}
    </div>
  )
}
