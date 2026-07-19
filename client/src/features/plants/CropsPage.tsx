import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { useSystems } from '../systems/SystemContext'
import { prettyCrop } from './api'
import {
  fetchCustomCrops,
  fetchSeedVarieties,
  deleteCustomCrop,
  addSeedVariety,
  deleteSeedVariety,
  type CustomCrop,
  type SeedVariety,
} from './cropsAdmin'
import { CustomCropModal } from './CustomCropModal'
import '../dashboard/dashboard.css'
import '../fish/fish.css'
import './plants.css'

const cap = (s?: string | null) => (s ? s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '')
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

// One row per crop from the user's own crop list, plus its seed varieties.
type CropEntry = {
  key: string
  varietyKey: string
  name: string
  category: string
  meta: string[]
  customCrop?: CustomCrop
  varieties: SeedVariety[]
}

function buildEntries(customCrops: CustomCrop[], seeds: SeedVariety[]): CropEntry[] {
  const byKey = new Map<string, CropEntry>()

  const ecRange = (min: number | null, max: number | null, single: number | null) =>
    min != null && max != null ? `EC ${min}–${max}` : single != null ? `EC ${single}` : null
  const meta = (days: number | null, spacing: number | null, ec: string | null) =>
    [days != null ? `${days} d to harvest` : null, spacing != null ? `${spacing} cm spacing` : null, ec].filter(Boolean) as string[]

  for (const c of customCrops) {
    const code = c.crop_code || slug(c.crop_name)
    byKey.set(code, {
      key: `custom:${c.id}`,
      varietyKey: code,
      name: c.crop_name,
      category: cap(c.category),
      meta: meta(c.growth_days, c.plant_spacing, ecRange(c.ec_min, c.ec_max, c.target_ec)),
      customCrop: c,
      varieties: [],
    })
  }

  // Attach seed varieties to their crop (keyed by crop_code).
  const groups = new Map<string, SeedVariety[]>()
  for (const s of seeds) {
    const arr = groups.get(s.crop_type) ?? []
    arr.push(s)
    groups.set(s.crop_type, arr)
  }
  for (const [ct, vs] of groups) {
    let entry = byKey.get(ct) ?? [...byKey.values()].find((e) => e.varietyKey.toLowerCase() === ct.toLowerCase())
    if (!entry) {
      entry = { key: `seed:${ct}`, varietyKey: ct, name: prettyCrop(ct), category: '', meta: [], varieties: [] }
      byKey.set(entry.key, entry)
    }
    entry.varieties = vs.slice().sort((a, b) => a.variety_name.localeCompare(b.variety_name))
  }

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function Crops() {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const [cropModal, setCropModal] = useState<{ crop?: CustomCrop } | null>(null)
  const [confirmDel, setConfirmDel] = useState<CustomCrop | null>(null)
  const [search, setSearch] = useState('')
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [newVar, setNewVar] = useState('')

  const { data: customCrops = [] } = useQuery({ queryKey: ['custom-crops', activeId], queryFn: () => fetchCustomCrops(activeId as string), enabled: !!activeId })
  const { data: seeds = [] } = useQuery({ queryKey: ['seed-varieties'], queryFn: fetchSeedVarieties })

  const delCrop = useMutation({
    mutationFn: (c: CustomCrop) => deleteCustomCrop(c.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-crops'] }); qc.invalidateQueries({ queryKey: ['crop-options'] }); setConfirmDel(null) },
  })
  const addSeed = useMutation({
    mutationFn: ({ cropType, name }: { cropType: string; name: string }) => addSeedVariety(cropType, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seed-varieties'] }); setNewVar(''); setAddingFor(null) },
  })
  const delSeed = useMutation({
    mutationFn: (id: number) => deleteSeedVariety(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seed-varieties'] }),
  })

  const entries = useMemo(() => buildEntries(customCrops, seeds), [customCrops, seeds])
  const filtered = entries.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()))

  function submitVariety(e: FormEvent, cropType: string) {
    e.preventDefault()
    if (newVar.trim()) addSeed.mutate({ cropType, name: newVar.trim() })
  }

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Crops</h2>
        <button className="btn feed-btn" onClick={() => setCropModal({})}>+ Add crop</button>
      </div>
      <p style={{ margin: '0 0 14px', color: 'var(--ink-faint)', fontSize: 13 }}>
        Your crop list — edit or delete any of these freely; changes are yours alone. Used when recording a planting.
      </p>

      <input className="crop-search" type="search" placeholder="Search crops…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="crop-library">
        {filtered.map((e) => (
          <div className="crop-card" key={e.key}>
            <div className="crop-card-head">
              <span className="crop-name">{e.name}</span>
              {e.category && <span className="crop-cat">{e.category}</span>}
              {e.customCrop && (
                <span className="crop-card-actions">
                  <button className="link-btn" onClick={() => setCropModal({ crop: e.customCrop })}>Edit</button>
                  <button className="link-btn danger" onClick={() => setConfirmDel(e.customCrop!)}>Delete</button>
                </span>
              )}
            </div>

            {e.meta.length > 0 && <div className="crop-meta">{e.meta.join(' · ')}</div>}

            <div className="crop-varieties">
              {e.varieties.map((v) => (
                <span className="variety-chip" key={v.id}>
                  {v.variety_name}
                  <button aria-label={`Remove ${v.variety_name}`} onClick={() => delSeed.mutate(v.id)}>×</button>
                </span>
              ))}
              {addingFor === e.varietyKey ? (
                <form className="variety-add-inline" onSubmit={(ev) => submitVariety(ev, e.varietyKey)}>
                  <input type="text" value={newVar} onChange={(ev) => setNewVar(ev.target.value)} placeholder="Variety name" autoFocus />
                  <button type="submit" className="row-btn" disabled={addSeed.isPending}>Add</button>
                  <button type="button" className="link-btn" onClick={() => { setAddingFor(null); setNewVar('') }}>Cancel</button>
                </form>
              ) : (
                <button className="variety-chip add" onClick={() => { setAddingFor(e.varietyKey); setNewVar('') }}>+ variety</button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty">No crops match “{search}”.</div>}
      </div>

      {cropModal && <CustomCropModal crop={cropModal.crop} onClose={() => setCropModal(null)} />}
      {confirmDel && (
        <Modal title="Delete custom crop" onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>Delete <b>{confirmDel.crop_name}</b>? This can't be undone.</p>
          <div className="mform-actions">
            <button type="button" className="ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={delCrop.isPending} onClick={() => delCrop.mutate(confirmDel)}>{delCrop.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
