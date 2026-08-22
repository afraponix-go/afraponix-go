import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { useAuth } from '../auth/AuthContext'
import {
  fetchCropTargets,
  saveSystemTargets,
  resetSystemTargets,
  saveDefaultTargets,
  type Stage,
  type TargetLevels,
} from './cropTargets'
import './plants.css'

const KEYS = ['n', 'p', 'k', 'ca', 'mg', 'fe'] as const
type Key = (typeof KEYS)[number]
const LABELS: Record<Key, string> = { n: 'N', p: 'P', k: 'K', ca: 'Ca', mg: 'Mg', fe: 'Fe' }

const numOrNull = (s: string): number | null => (s.trim() === '' || isNaN(Number(s)) ? null : Number(s))
const fromLevels = (lv: TargetLevels | null): Record<Key, string> =>
  Object.fromEntries(KEYS.map((k) => [k, lv && lv[k] != null ? String(lv[k]) : ''])) as Record<Key, string>
const toLevels = (v: Record<Key, string>): TargetLevels =>
  Object.fromEntries(KEYS.map((k) => [k, numOrNull(v[k])])) as TargetLevels

export function CropTargetsModal({ systemId, cropCode, cropName, onClose }: { systemId: string; cropCode: string; cropName: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.userRole === 'admin'
  const [stage, setStage] = useState<Stage>('vegetative')
  const [vals, setVals] = useState<Record<Key, string>>(fromLevels(null))
  const [seeded, setSeeded] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ['crop-targets', systemId, cropCode, stage],
    queryFn: () => fetchCropTargets(systemId, cropCode, stage),
  })
  const data = q.data
  const isFruiting = !!data?.stages?.includes('fruiting')

  useEffect(() => { setSeeded('') }, [stage])
  useEffect(() => {
    if (data && data.stage === stage && seeded !== stage) {
      setVals(fromLevels(data.effective))
      setSeeded(stage)
    }
  }, [data, stage, seeded])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['crop-targets'] })
  const done = (msg: string) => { setError(null); setNote(msg); invalidate() }
  const onErr = (e: unknown) => setError(e instanceof ApiError ? e.message : 'Something went wrong.')

  const saveOverride = useMutation({
    mutationFn: () => saveSystemTargets(systemId, cropCode, stage, toLevels(vals)),
    onSuccess: () => done('Saved for this system.'),
    onError: onErr,
  })
  const reset = useMutation({
    mutationFn: () => resetSystemTargets(systemId, cropCode, stage),
    onSuccess: () => { setSeeded(''); done('Reset to the default.') },
    onError: onErr,
  })
  const saveDefault = useMutation({
    mutationFn: () => saveDefaultTargets(cropCode, stage, toLevels(vals)),
    onSuccess: () => done('Global default updated.'),
    onError: onErr,
  })

  const busy = saveOverride.isPending || reset.isPending || saveDefault.isPending
  const sourceLabel =
    data?.source === 'system' ? 'This system’s override' : data?.source === 'default' ? 'Recommended default' : 'No targets set yet'

  return (
    <Modal title={`Nutrient targets · ${cropName}`} onClose={onClose}>
      <div className="mform">
        {error && <div className="wq-error">{error}</div>}
        {note && !error && <div className="ct-note-ok">{note}</div>}

        {isFruiting && (
          <div className="nd-stage" role="group" aria-label="Growth stage" style={{ marginBottom: 6 }}>
            <button type="button" className={stage === 'vegetative' ? 'active' : ''} onClick={() => setStage('vegetative')}>Vegetative</button>
            <button type="button" className={stage === 'fruiting' ? 'active' : ''} onClick={() => setStage('fruiting')}>Fruiting</button>
          </div>
        )}

        <p className="ct-source">
          Currently: <b>{sourceLabel}</b>
          {data?.source === 'default' && ' · edits below save an override for this system only.'}
          {data?.source === 'system' && ' · overrides the recommended default for this system only.'}
        </p>

        <label className="field-label">Target levels <span className="unit-hint">(ppm)</span></label>
        <div className="nutrient-grid">
          {KEYS.map((k) => (
            <div className="field" key={k}>
              <label htmlFor={`ct-${k}`}>{LABELS[k]}</label>
              <input
                id={`ct-${k}`}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={vals[k]}
                placeholder={data?.default && data.default[k] != null ? String(data.default[k]) : '0'}
                onChange={(e) => { setNote(null); setVals((v) => ({ ...v, [k]: e.target.value })) }}
              />
            </div>
          ))}
        </div>

        <div className="ct-actions">
          {data?.hasOverride && (
            <button type="button" className="link-btn" disabled={busy} onClick={() => reset.mutate()}>↺ Reset to default</button>
          )}
          <div className="ct-actions-right">
            {isAdmin && (
              <button type="button" className="ghost" disabled={busy} onClick={() => saveDefault.mutate()}>Save as default</button>
            )}
            <button type="button" className="btn" disabled={busy} onClick={() => saveOverride.mutate()}>
              {saveOverride.isPending ? 'Saving…' : 'Save for this system'}
            </button>
          </div>
        </div>
        {isAdmin && <p className="ct-admin-hint">You’re an admin: “Save as default” changes the recommended values for everyone; “Save for this system” only affects the active system.</p>}
      </div>
    </Modal>
  )
}
