import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { fetchCustomCrops, fetchSeedVarieties, addSeedVariety } from '../plants/cropsAdmin'
import { createSeedling, updateSeedling, type Seedling } from './api'
import './seedlings.css'

const numOrU = (s: string): number | undefined => (s.trim() === '' || isNaN(Number(s)) ? undefined : Number(s))
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Fallback predicted days by crop category when the crop record has none set.
const CAT_DEFAULTS: Record<string, { g: number; t: number }> = {
  leafy_greens: { g: 3, t: 21 },
  herbs: { g: 5, t: 21 },
  fruiting_vegetables: { g: 5, t: 28 },
  root_vegetables: { g: 7, t: 28 },
}
const defaultDays = (cat?: string | null) => CAT_DEFAULTS[cat ?? ''] ?? { g: 4, t: 21 }

type Row = { trays: string; cells: string }

// farmId: the nursery the batch is sown into. systemId: a representative system
// in the farm, only used to load the (per-user) crop list.
export function SowModal({ farmId, systemId, seedling, onClose }: { farmId: string; systemId?: string; seedling?: Seedling; onClose: () => void }) {
  const qc = useQueryClient()
  const editing = !!seedling
  const { data: crops = [] } = useQuery({ queryKey: ['custom-crops', systemId], queryFn: () => fetchCustomCrops(systemId as string), enabled: !!systemId })
  const { data: seeds = [] } = useQuery({ queryKey: ['seed-varieties'], queryFn: fetchSeedVarieties })

  const [cropCode, setCropCode] = useState(seedling?.crop_code ?? '')
  const [variety, setVariety] = useState(seedling?.seed_variety ?? '')
  const [addingVar, setAddingVar] = useState(false)
  const [newVar, setNewVar] = useState('')
  const [sowDate, setSowDate] = useState(seedling?.sow_date ?? todayISO())
  const [rows, setRows] = useState<Row[]>(
    seedling?.tray_groups?.length
      ? seedling.tray_groups.map((g) => ({ trays: String(g.trays), cells: String(g.cells) }))
      : [{ trays: '1', cells: '128' }],
  )
  const [germDays, setGermDays] = useState(seedling?.predicted_germ_days != null ? String(seedling.predicted_germ_days) : '')
  const [transplantDays, setTransplantDays] = useState(seedling?.predicted_transplant_days != null ? String(seedling.predicted_transplant_days) : '')
  const [notes, setNotes] = useState(seedling?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const cropOptions = useMemo(() => crops.map((c) => ({ code: c.crop_code || slug(c.crop_name), name: c.crop_name, category: c.category, germ: c.germination_days, transplant: c.days_to_transplant })), [crops])
  const varieties = useMemo(() => seeds.filter((s) => !cropCode || slug(s.crop_type) === cropCode).map((s) => s.variety_name), [seeds, cropCode])
  const total = rows.reduce((s, r) => s + (numOrU(r.trays) ?? 0) * (numOrU(r.cells) ?? 0), 0)

  const onCrop = (code: string) => {
    setCropCode(code)
    setVariety('')
    const c = cropOptions.find((x) => x.code === code)
    if (c) { const def = defaultDays(c.category); setGermDays(String(c.germ ?? def.g)); setTransplantDays(String(c.transplant ?? def.t)) }
  }
  const setRow = (i: number, key: keyof Row, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: v } : r)))
  const addRow = () => setRows((rs) => [...rs, { trays: '1', cells: '128' }])
  const removeRow = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs))

  const addVarMut = useMutation({
    mutationFn: (name: string) => addSeedVariety(cropCode, name),
    onSuccess: (_d, name) => { qc.invalidateQueries({ queryKey: ['seed-varieties'] }); setVariety(name); setAddingVar(false); setNewVar('') },
  })

  const mut = useMutation({
    mutationFn: () => {
      const crop = cropOptions.find((c) => c.code === cropCode)
      const trayGroups = rows.map((r) => ({ trays: numOrU(r.trays) ?? 0, cells: numOrU(r.cells) ?? 0 })).filter((g) => g.trays > 0 && g.cells > 0)
      const input = {
        crop_code: cropCode || null,
        crop_name: crop?.name ?? null,
        seed_variety: variety.trim() || null,
        sow_date: sowDate,
        tray_groups: trayGroups,
        predicted_germ_days: numOrU(germDays) ?? null,
        predicted_transplant_days: numOrU(transplantDays) ?? null,
        notes: notes.trim() || null,
      }
      return editing ? updateSeedling(seedling!.id, input) : createSeedling(farmId, input)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seedlings'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!sowDate) return setError('Enter the sow date.')
    if (!cropCode) return setError('Choose a crop.')
    if (total <= 0) return setError('Add at least one tray size.')
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
            {addingVar ? (
              <div className="spray-op-add">
                <input type="text" value={newVar} onChange={(e) => setNewVar(e.target.value)} placeholder="New variety" autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newVar.trim() && cropCode) addVarMut.mutate(newVar.trim()) } }} />
                <button type="button" className="btn" disabled={addVarMut.isPending || !newVar.trim() || !cropCode} onClick={() => addVarMut.mutate(newVar.trim())}>Add</button>
                <button type="button" className="ghost" onClick={() => { setAddingVar(false); setNewVar('') }}>Cancel</button>
              </div>
            ) : (
              <select id="sw-variety" value={variety} onChange={(e) => { if (e.target.value === '__add__') { if (cropCode) setAddingVar(true) } else setVariety(e.target.value) }}>
                <option value="">—</option>
                {varieties.map((v) => <option key={v} value={v}>{v}</option>)}
                {cropCode && <option value="__add__">＋ Add new variety…</option>}
              </select>
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="sw-date">Sow date</label>
          <input id="sw-date" type="date" value={sowDate} onChange={(e) => setSowDate(e.target.value)} />
        </div>

        <label className="field-label">Trays</label>
        <div className="tray-groups">
          <div className="tray-head"><span>Trays</span><span>Cells / tray</span><span></span></div>
          {rows.map((r, i) => (
            <div className="tray-row" key={i}>
              <input type="number" min="1" step="1" inputMode="numeric" value={r.trays} onChange={(e) => setRow(i, 'trays', e.target.value)} placeholder="1" />
              <input type="number" min="1" step="1" inputMode="numeric" value={r.cells} onChange={(e) => setRow(i, 'cells', e.target.value)} placeholder="128" />
              <button type="button" className="tray-x" onClick={() => removeRow(i)} disabled={rows.length === 1} aria-label="Remove">×</button>
            </div>
          ))}
          <div className="tray-foot">
            <button type="button" className="link-btn" onClick={addRow}>+ Add tray size</button>
            <span className="tray-total">Total sown: <b>{total.toLocaleString()}</b></span>
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
