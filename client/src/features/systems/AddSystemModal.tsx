import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { createSystem, createFishTank, saveGrowBedsBulk, createDemoSystem, fetchSystems } from './api'
import { useSystems } from './SystemContext'
import { BED_TYPES, bedShape, computeBed, type BedInputs } from '../plants/bedMath'
import '../fish/fish.css'
import '../water/water.css'
import '../plants/plants.css'
import './systems.css'

const FISH_TYPES = ['tilapia', 'trout', 'catfish', 'bass', 'other']
const num = (s: string) => (s.trim() === '' || isNaN(Number(s)) ? 0 : Number(s))
const numOrNull = (s: string) => (s.trim() === '' || isNaN(Number(s)) ? null : Number(s))

type Tank = { name: string; volume: string; fish_type: string; stocking: string; harvest: string }
type Bed = {
  name: string; type: string
  length: string; width: string; height: string
  verticals: string; perVertical: string
  troughLength: string; troughCount: string; spacing: string; reservoir: string
}
const newTank = (i: number): Tank => ({ name: `Tank ${i}`, volume: '7000', fish_type: 'tilapia', stocking: '20', harvest: '500' })
const newBed = (i: number): Bed => ({ name: `Bed ${i}`, type: 'dwc', length: '', width: '', height: '', verticals: '', perVertical: '', troughLength: '', troughCount: '', spacing: '', reservoir: '' })

function bedToInputs(b: Bed): BedInputs {
  return {
    length_meters: num(b.length), width_meters: num(b.width), height_meters: num(b.height),
    vertical_count: num(b.verticals), plants_per_vertical: num(b.perVertical),
    trough_length: num(b.troughLength), trough_count: num(b.troughCount), plant_spacing: num(b.spacing),
    reservoir_volume_liters: num(b.reservoir),
  }
}

const STEPS = ['Setup', 'Basics', 'Fish tanks', 'Grow beds']

export function AddSystemModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { setActiveId } = useSystems()
  const [step, setStep] = useState(1)
  const [method, setMethod] = useState<'custom' | 'demo'>('custom')
  const [name, setName] = useState('')
  const [tankCount, setTankCount] = useState(1)
  const [bedCount, setBedCount] = useState(2)
  const [tanks, setTanks] = useState<Tank[]>([newTank(1)])
  const [beds, setBeds] = useState<Bed[]>([newBed(1), newBed(2)])
  const [error, setError] = useState<string | null>(null)

  // Keep the tank/bed arrays in sync with the chosen counts (preserving entries).
  useEffect(() => {
    setTanks((prev) => Array.from({ length: tankCount }, (_, i) => prev[i] ?? newTank(i + 1)))
  }, [tankCount])
  useEffect(() => {
    setBeds((prev) => Array.from({ length: bedCount }, (_, i) => prev[i] ?? newBed(i + 1)))
  }, [bedCount])

  const setTank = (i: number, patch: Partial<Tank>) => setTanks((p) => p.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  const setBed = (i: number, patch: Partial<Bed>) => setBeds((p) => p.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))

  const totalArea = useMemo(() => beds.reduce((n, b) => n + computeBed(b.type, bedToInputs(b)).equivalent_m2, 0), [beds])

  const mutation = useMutation({
    mutationFn: async () => {
      if (method === 'demo') {
        await createDemoSystem(name)
        const list = await fetchSystems()
        return list.slice().sort((a, b) => b.id.localeCompare(a.id))[0]?.id ?? null
      }
      const id = `system_${Date.now()}`
      await createSystem({
        id, system_name: name, system_type: 'aquaponics',
        fish_type: tanks[0]?.fish_type || 'tilapia',
        fish_tank_count: tankCount, grow_bed_count: bedCount,
        total_grow_area: Math.round(totalArea * 100) / 100,
      })
      for (let i = 0; i < tanks.length; i++) {
        await createFishTank(id, { tank_number: i + 1, volume_liters: num(tanks[i].volume) || 1000, fish_type: tanks[i].fish_type })
      }
      const growBeds = beds.map((b, i) => {
        const c = computeBed(b.type, bedToInputs(b))
        const nft = bedShape(b.type) === 'nft'
        return {
          bed_number: i + 1, bed_type: b.type, bed_name: b.name.trim() || `Bed ${i + 1}`,
          volume_liters: Math.round(c.volume_liters) || null, area_m2: c.area_m2 || null, equivalent_m2: c.equivalent_m2 || null,
          length_meters: numOrNull(b.length), width_meters: numOrNull(b.width), height_meters: numOrNull(b.height),
          plant_capacity: c.plant_capacity, vertical_count: numOrNull(b.verticals), plants_per_vertical: numOrNull(b.perVertical),
          reservoir_volume: nft ? numOrNull(b.reservoir) : Math.round(c.volume_liters) || null,
          trough_length: numOrNull(b.troughLength), trough_count: numOrNull(b.troughCount), plant_spacing: numOrNull(b.spacing),
          reservoir_volume_liters: nft ? numOrNull(b.reservoir) : null,
        }
      })
      await saveGrowBedsBulk(id, growBeds)
      return id
    },
    onSuccess: async (newId) => {
      await qc.invalidateQueries({ queryKey: ['systems'] })
      if (newId) setActiveId(newId)
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  const lastStep = method === 'demo' ? 2 : 4
  function next() {
    setError(null)
    if (step === 1) return setStep(2)
    if (step === 2) {
      if (!name.trim()) return setError('Enter a system name.')
      if (method === 'demo') return submit()
      return setStep(3)
    }
    if (step === 3) return setStep(4)
  }
  function submit() {
    setError(null)
    if (!name.trim()) return setError('Enter a system name.')
    if (method === 'custom') {
      for (const b of beds) if (computeBed(b.type, bedToInputs(b)).equivalent_m2 <= 0) return setError(`Enter dimensions for ${b.name}.`)
    }
    mutation.mutate()
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (step === lastStep) submit()
    else next()
  }

  return (
    <Modal title="Add system" onClose={onClose} wide>
      <div className="wizard-steps">
        {STEPS.map((s, i) => (
          <span key={s} className={`wizard-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''} ${method === 'demo' && i > 1 ? 'skip' : ''}`}>
            <b>{i + 1}</b> {s}
          </span>
        ))}
      </div>

      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}

        {step === 1 && (
          <div className="setup-choices">
            <label className={`setup-choice ${method === 'custom' ? 'sel' : ''}`}>
              <input type="radio" name="setup" checked={method === 'custom'} onChange={() => setMethod('custom')} />
              <span className="setup-title">Start fresh</span>
              <span className="setup-sub">Configure your fish tanks and grow beds.</span>
            </label>
            <label className={`setup-choice ${method === 'demo' ? 'sel' : ''}`}>
              <input type="radio" name="setup" checked={method === 'demo'} onChange={() => setMethod('demo')} />
              <span className="setup-title">Import demo system</span>
              <span className="setup-sub">A ready-made system with sample data to explore.</span>
            </label>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="field">
              <label htmlFor="sw-name">System name</label>
              <input id="sw-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Backyard Aquaponics" autoFocus />
            </div>
            {method === 'custom' && (
              <div className="field-row">
                <div className="field">
                  <label htmlFor="sw-tanks">Number of fish tanks</label>
                  <input id="sw-tanks" type="number" min="1" max="20" step="1" value={tankCount} onChange={(e) => setTankCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
                </div>
                <div className="field">
                  <label htmlFor="sw-beds">Number of grow beds</label>
                  <input id="sw-beds" type="number" min="1" max="30" step="1" value={bedCount} onChange={(e) => setBedCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
                </div>
              </div>
            )}
            {method === 'demo' && <p style={{ color: 'var(--ink-faint)', fontSize: 13, margin: 0 }}>We'll create a fully populated demo system with this name.</p>}
          </>
        )}

        {step === 3 && (
          <div className="wizard-cards">
            {tanks.map((t, i) => (
              <div className="wizard-card" key={i}>
                <div className="wizard-card-head">🐟 Fish Tank {i + 1}</div>
                <div className="field-row">
                  <div className="field"><label>Tank name</label><input type="text" value={t.name} onChange={(e) => setTank(i, { name: e.target.value })} /></div>
                  <div className="field"><label>Volume <span className="unit-hint">(L)</span></label><input type="number" min="100" step="50" value={t.volume} onChange={(e) => setTank(i, { volume: e.target.value })} /></div>
                </div>
                <div className="field-row">
                  <div className="field"><label>Fish type</label>
                    <select value={t.fish_type} onChange={(e) => setTank(i, { fish_type: e.target.value })}>
                      {FISH_TYPES.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Stocking <span className="unit-hint">(fish/m³)</span></label><input type="number" min="1" step="1" value={t.stocking} onChange={(e) => setTank(i, { stocking: e.target.value })} /></div>
                  <div className="field"><label>Harvest wt <span className="unit-hint">(g)</span></label><input type="number" min="50" step="50" value={t.harvest} onChange={(e) => setTank(i, { harvest: e.target.value })} /></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="wizard-cards">
            {beds.map((b, i) => {
              const shape = bedShape(b.type)
              const c = computeBed(b.type, bedToInputs(b))
              return (
                <div className="wizard-card" key={i}>
                  <div className="wizard-card-head">🌱 Grow Bed {i + 1}</div>
                  <div className="field-row">
                    <div className="field"><label>Bed name</label><input type="text" value={b.name} onChange={(e) => setBed(i, { name: e.target.value })} /></div>
                    <div className="field"><label>Type</label>
                      <select value={b.type} onChange={(e) => setBed(i, { type: e.target.value })}>
                        {BED_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {(shape === 'area' || shape === 'vertical') && (
                    <div className="field-row">
                      <div className="field"><label>Length <span className="unit-hint">(m)</span></label><input type="number" min="0" step="any" value={b.length} onChange={(e) => setBed(i, { length: e.target.value })} /></div>
                      <div className="field"><label>Width <span className="unit-hint">(m)</span></label><input type="number" min="0" step="any" value={b.width} onChange={(e) => setBed(i, { width: e.target.value })} /></div>
                      <div className="field"><label>{shape === 'vertical' ? 'Base height' : 'Depth'} <span className="unit-hint">(m)</span></label><input type="number" min="0" step="any" value={b.height} onChange={(e) => setBed(i, { height: e.target.value })} /></div>
                    </div>
                  )}
                  {shape === 'vertical' && (
                    <div className="field-row">
                      <div className="field"><label>Towers</label><input type="number" min="1" step="1" value={b.verticals} onChange={(e) => setBed(i, { verticals: e.target.value })} /></div>
                      <div className="field"><label>Plants per tower</label><input type="number" min="1" step="1" value={b.perVertical} onChange={(e) => setBed(i, { perVertical: e.target.value })} /></div>
                    </div>
                  )}
                  {shape === 'nft' && (
                    <div className="field-row">
                      <div className="field"><label>Channel length <span className="unit-hint">(m)</span></label><input type="number" min="0" step="any" value={b.troughLength} onChange={(e) => setBed(i, { troughLength: e.target.value })} /></div>
                      <div className="field"><label>Channels</label><input type="number" min="1" step="1" value={b.troughCount} onChange={(e) => setBed(i, { troughCount: e.target.value })} /></div>
                      <div className="field"><label>Spacing <span className="unit-hint">(cm)</span></label><input type="number" min="1" step="any" value={b.spacing} onChange={(e) => setBed(i, { spacing: e.target.value })} /></div>
                      <div className="field"><label>Reservoir <span className="unit-hint">(L)</span></label><input type="number" min="0" step="any" value={b.reservoir} onChange={(e) => setBed(i, { reservoir: e.target.value })} /></div>
                    </div>
                  )}
                  <div className="bed-calc"><span><b>{c.equivalent_m2.toFixed(1)}</b> m² grow area</span><span><b>{Math.round(c.volume_liters).toLocaleString()}</b> L</span>{c.plant_capacity != null && <span><b>{c.plant_capacity.toLocaleString()}</b> plant sites</span>}</div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mform-actions">
          {step > 1 && <button type="button" className="ghost" onClick={() => setStep(step - 1)}>Back</button>}
          <button type="submit" className="btn" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : step === lastStep ? (method === 'demo' ? 'Create demo system' : 'Create system') : 'Next'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
