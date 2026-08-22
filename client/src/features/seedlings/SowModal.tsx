import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { fetchCustomCrops, fetchSeedVarieties } from '../plants/cropsAdmin'
import { createSeedling, updateSeedling, type Seedling } from './api'
import './seedlings.css'

const numOrU = (s: string): number | undefined => (s.trim() === '' || isNaN(Number(s)) ? undefined : Number(s))
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function SowModal({ systemId, seedling, onClose }: { systemId: string; seedling?: Seedling; onClose: () => void }) {
  const qc = useQueryClient()
  const editing = !!seedling
  const { data: crops = [] } = useQuery({ queryKey: ['custom-crops', systemId], queryFn: () => fetchCustomCrops(systemId) })
  const { data: seeds = [] } = useQuery({ queryKey: ['seed-varieties'], queryFn: fetchSeedVarieties })

  const [cropCode, setCropCode] = useState(seedling?.crop_code ?? '')
  const [variety, setVariety] = useState(seedling?.seed_variety ?? '')
  const [sowDate, setSowDate] = useState(seedling?.sow_date ?? todayISO())
  const [trays, setTrays] = useState(seedling?.trays != null ? String(seedling.trays) : '1')
  const [cells, setCells] = useState(seedling?.cells_per_tray != null ? String(seedling.cells_per_tray) : '128')
  const [germDays, setGermDays] = useState(seedling?.predicted_germ_days != null ? String(seedling.predicted_germ_days) : '')
  const [transplantDays, setTransplantDays] = useState(seedling?.predicted_transplant_days != null ? String(seedling.predicted_transplant_days) : '')
  const [notes, setNotes] = useState(seedling?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const cropOptions = useMemo(() => crops.map((c) => ({ code: c.crop_code || slug(c.crop_name), name: c.crop_name, germ: c.germination_days, transplant: c.days_to_transplant })), [crops])
  const varieties = useMemo(() => seeds.filter((s) => !cropCode || slug(s.crop_type) === cropCode).map((s) => s.variety_name), [seeds, cropCode])
  const total = (numOrU(trays) ?? 0) * (numOrU(cells) ?? 0)

  const onCrop = (code: string) => {
    setCropCode(code)
    const c = cropOptions.find((x) => x.code === code)
    if (c) { if (c.germ != null && !germDays) setGermDays(String(c.germ)); if (c.transplant != null && !transplantDays) setTransplantDays(String(c.transplant)) }
  }

  const mut = useMutation({
    mutationFn: () => {
      const crop = cropOptions.find((c) => c.code === cropCode)
      const input = {
        crop_code: cropCode || null,
        crop_name: crop?.name ?? null,
        seed_variety: variety.trim() || null,
        sow_date: sowDate,
        trays: numOrU(trays) ?? 1,
        cells_per_tray: numOrU(cells) ?? 128,
        predicted_germ_days: numOrU(germDays) ?? null,
        predicted_transplant_days: numOrU(transplantDays) ?? null,
        notes: notes.trim() || null,
      }
      return editing ? updateSeedling(seedling!.id, input) : createSeedling(systemId, input)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seedlings'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!sowDate) return setError('Enter the sow date.')
    if (!cropCode) return setError('Choose a crop.')
    mut.mutate()
  }

  return (
    <Modal title={editing ? 'Edit sowing' : 'New sowing'} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field-row">
          <div className="field">
            <label htmlFor="sw-crop">Crop</label>
            <select id="sw-crop" value={cropCode} onChange={(e) => onCrop(e.target.value)}>
              <option value="">Select a crop…</option>
              {cropOptions.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sw-variety">Variety</label>
            <input id="sw-variety" type="text" list="sw-variety-list" value={variety} onChange={(e) => setVariety(e.target.value)} placeholder="optional" />
            <datalist id="sw-variety-list">{varieties.map((v) => <option key={v} value={v} />)}</datalist>
          </div>
        </div>

        <div className="field">
          <label htmlFor="sw-date">Sow date</label>
          <input id="sw-date" type="date" value={sowDate} onChange={(e) => setSowDate(e.target.value)} />
        </div>

        <div className="field-row seedling-tray-row">
          <div className="field">
            <label htmlFor="sw-trays">Trays</label>
            <input id="sw-trays" type="number" min="1" step="1" inputMode="numeric" value={trays} onChange={(e) => setTrays(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="sw-cells">Cells / tray</label>
            <input id="sw-cells" type="number" min="1" step="1" inputMode="numeric" value={cells} onChange={(e) => setCells(e.target.value)} />
          </div>
          <div className="field seedling-total">
            <label>Total sown</label>
            <div className="seedling-total-val">{total.toLocaleString()}</div>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="sw-germ">Predicted germ. days</label>
            <input id="sw-germ" type="number" min="0" step="1" inputMode="numeric" value={germDays} onChange={(e) => setGermDays(e.target.value)} placeholder="from crop" />
          </div>
          <div className="field">
            <label htmlFor="sw-transplant">Predicted days to transplant</label>
            <input id="sw-transplant" type="number" min="0" step="1" inputMode="numeric" value={transplantDays} onChange={(e) => setTransplantDays(e.target.value)} placeholder="from crop" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="sw-notes">Notes</label>
          <input id="sw-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : editing ? 'Save' : 'Add sowing'}</button>
        </div>
      </form>
    </Modal>
  )
}
