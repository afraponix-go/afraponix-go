import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { useSystems } from '../systems/SystemContext'
import { saveBedConfig, type BedConfigPayload, type GrowBedConfig } from '../growbeds/api'
import { BED_TYPES, bedShape, computeBed, normalizeBedType, type BedInputs } from './bedMath'

const numOrNull = (s: string): number | null => (s.trim() === '' || isNaN(Number(s)) ? null : Number(s))

export function BedConfigModal({
  bed,
  existingBedNumbers,
  onClose,
}: {
  bed?: GrowBedConfig
  existingBedNumbers: number[]
  onClose: () => void
}) {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const editing = !!bed

  const [name, setName] = useState(bed?.bed_name ?? '')
  const [type, setType] = useState(normalizeBedType(bed?.bed_type) || 'dwc')
  const [length, setLength] = useState(bed?.length_meters != null ? String(bed.length_meters) : '')
  const [width, setWidth] = useState(bed?.width_meters != null ? String(bed.width_meters) : '')
  const [height, setHeight] = useState(bed?.height_meters != null ? String(bed.height_meters) : '')
  const [verticals, setVerticals] = useState(bed?.vertical_count != null ? String(bed.vertical_count) : '')
  const [perVertical, setPerVertical] = useState(bed?.plants_per_vertical != null ? String(bed.plants_per_vertical) : '')
  const [troughLen, setTroughLen] = useState(bed?.trough_length != null ? String(bed.trough_length) : '')
  const [troughCount, setTroughCount] = useState(bed?.trough_count != null ? String(bed.trough_count) : '')
  const [spacing, setSpacing] = useState(bed?.plant_spacing != null ? String(bed.plant_spacing) : '')
  const [reservoir, setReservoir] = useState(bed?.volume_liters != null && bedShape(bed?.bed_type) === 'nft' ? String(bed.volume_liters) : '')
  const [error, setError] = useState<string | null>(null)

  const shape = bedShape(type)

  const inputs: BedInputs = {
    length_meters: numOrNull(length),
    width_meters: numOrNull(width),
    height_meters: numOrNull(height),
    vertical_count: numOrNull(verticals),
    plants_per_vertical: numOrNull(perVertical),
    trough_length: numOrNull(troughLen),
    trough_count: numOrNull(troughCount),
    plant_spacing: numOrNull(spacing),
    reservoir_volume_liters: numOrNull(reservoir),
  }
  const computed = useMemo(() => computeBed(type, inputs), [type, length, width, height, verticals, perVertical, troughLen, troughCount, spacing, reservoir])

  const mutation = useMutation({
    mutationFn: () => {
      const bedNumber = editing ? (bed!.bed_number as number) : Math.max(0, ...existingBedNumbers) + 1
      const payload: BedConfigPayload = {
        bed_number: bedNumber,
        bed_type: type,
        bed_name: name.trim() || `Bed ${bedNumber}`,
        volume_liters: computed.volume_liters || null,
        area_m2: computed.area_m2 || null,
        equivalent_m2: computed.equivalent_m2 || null,
        length_meters: inputs.length_meters,
        width_meters: inputs.width_meters,
        height_meters: inputs.height_meters,
        plant_capacity: computed.plant_capacity,
        vertical_count: inputs.vertical_count,
        plants_per_vertical: inputs.plants_per_vertical,
        reservoir_volume: shape === 'nft' ? inputs.reservoir_volume_liters : computed.volume_liters || null,
        trough_length: inputs.trough_length,
        trough_count: inputs.trough_count,
        plant_spacing: inputs.plant_spacing,
        reservoir_volume_liters: shape === 'nft' ? inputs.reservoir_volume_liters : null,
      }
      return saveBedConfig(activeId as string, bedNumber, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grow-bed-configs'] })
      qc.invalidateQueries({ queryKey: ['grow-beds'] })
      qc.invalidateQueries({ queryKey: ['allocations'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (computed.equivalent_m2 <= 0) return setError('Enter the bed dimensions so a growing area can be calculated.')
    mutation.mutate()
  }

  return (
    <Modal title={editing ? `Edit ${bed?.bed_name ?? 'bed'}` : 'Add grow bed'} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}

        <div className="field-row">
          <div className="field">
            <label htmlFor="bc-name">Bed name</label>
            <input id="bc-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DWC Bed 1" autoFocus />
          </div>
          <div className="field">
            <label htmlFor="bc-type">Type</label>
            <select id="bc-type" value={type} onChange={(e) => setType(e.target.value)}>
              {BED_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {(shape === 'area' || shape === 'vertical') && (
          <div className="field-row">
            <div className="field">
              <label htmlFor="bc-len">Length <span className="unit-hint">(m)</span></label>
              <input id="bc-len" type="number" min="0" step="any" inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} placeholder="e.g. 2" />
            </div>
            <div className="field">
              <label htmlFor="bc-wid">Width <span className="unit-hint">(m)</span></label>
              <input id="bc-wid" type="number" min="0" step="any" inputMode="decimal" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="e.g. 1" />
            </div>
            <div className="field">
              <label htmlFor="bc-hgt">{shape === 'vertical' ? 'Base height' : 'Depth'} <span className="unit-hint">(m)</span></label>
              <input id="bc-hgt" type="number" min="0" step="any" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 0.3" />
            </div>
          </div>
        )}

        {shape === 'vertical' && (
          <div className="field-row">
            <div className="field">
              <label htmlFor="bc-vc">Towers</label>
              <input id="bc-vc" type="number" min="1" step="1" inputMode="numeric" value={verticals} onChange={(e) => setVerticals(e.target.value)} placeholder="e.g. 10" />
            </div>
            <div className="field">
              <label htmlFor="bc-ppv">Plants per tower</label>
              <input id="bc-ppv" type="number" min="1" step="1" inputMode="numeric" value={perVertical} onChange={(e) => setPerVertical(e.target.value)} placeholder="e.g. 20" />
            </div>
          </div>
        )}

        {shape === 'nft' && (
          <>
            <div className="field-row">
              <div className="field">
                <label htmlFor="bc-tl">Channel length <span className="unit-hint">(m)</span></label>
                <input id="bc-tl" type="number" min="0" step="any" inputMode="decimal" value={troughLen} onChange={(e) => setTroughLen(e.target.value)} placeholder="e.g. 4" />
              </div>
              <div className="field">
                <label htmlFor="bc-tc">Channels</label>
                <input id="bc-tc" type="number" min="1" step="1" inputMode="numeric" value={troughCount} onChange={(e) => setTroughCount(e.target.value)} placeholder="e.g. 6" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="bc-sp">Plant spacing <span className="unit-hint">(cm)</span></label>
                <input id="bc-sp" type="number" min="1" step="any" inputMode="decimal" value={spacing} onChange={(e) => setSpacing(e.target.value)} placeholder="e.g. 20" />
              </div>
              <div className="field">
                <label htmlFor="bc-rv">Reservoir <span className="unit-hint">(L)</span></label>
                <input id="bc-rv" type="number" min="0" step="any" inputMode="decimal" value={reservoir} onChange={(e) => setReservoir(e.target.value)} placeholder="e.g. 200" />
              </div>
            </div>
          </>
        )}

        <div className="bed-calc">
          <span><b>{computed.equivalent_m2.toFixed(1)}</b> m² grow area</span>
          <span><b>{Math.round(computed.volume_liters).toLocaleString()}</b> L</span>
          {computed.plant_capacity != null && <span><b>{computed.plant_capacity.toLocaleString()}</b> plant sites</span>}
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : editing ? 'Save bed' : 'Add bed'}</button>
        </div>
      </form>
    </Modal>
  )
}
