import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { useSystems } from '../systems/SystemContext'
import { prettyCrop } from './api'
import {
  fetchReferenceCrops,
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
import '../water/water.css'
import './plants.css'

const cap = (s?: string | null) => (s ? s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '—')

function groupVarieties(seeds: SeedVariety[]) {
  const map = new Map<string, SeedVariety[]>()
  for (const s of seeds) {
    const arr = map.get(s.crop_type) ?? []
    arr.push(s)
    map.set(s.crop_type, arr)
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

export function Crops() {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const [cropModal, setCropModal] = useState<{ crop?: CustomCrop } | null>(null)
  const [confirmDel, setConfirmDel] = useState<CustomCrop | null>(null)
  const [svCrop, setSvCrop] = useState('')
  const [svName, setSvName] = useState('')
  const [svError, setSvError] = useState<string | null>(null)

  const { data: refCrops = [] } = useQuery({ queryKey: ['reference-crops'], queryFn: fetchReferenceCrops })
  const { data: customCrops = [] } = useQuery({ queryKey: ['custom-crops', activeId], queryFn: () => fetchCustomCrops(activeId as string), enabled: !!activeId })
  const { data: seeds = [] } = useQuery({ queryKey: ['seed-varieties'], queryFn: fetchSeedVarieties })

  const delCrop = useMutation({
    mutationFn: (c: CustomCrop) => deleteCustomCrop(c.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-crops'] }); qc.invalidateQueries({ queryKey: ['crop-options'] }); setConfirmDel(null) },
  })
  const addSeed = useMutation({
    mutationFn: () => addSeedVariety(svCrop, svName.trim()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seed-varieties'] }); setSvName('') },
    onError: () => setSvError('Could not add — it may already exist.'),
  })
  const delSeed = useMutation({
    mutationFn: (id: number) => deleteSeedVariety(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seed-varieties'] }),
  })

  function onAddSeed(e: FormEvent) {
    e.preventDefault()
    setSvError(null)
    if (!svCrop) return setSvError('Choose a crop.')
    if (!svName.trim()) return setSvError('Enter a variety name.')
    addSeed.mutate()
  }

  return (
    <div>
      {/* Custom crops */}
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>My custom crops</h2>
        <button className="btn feed-btn" onClick={() => setCropModal({})}>+ Add custom crop</button>
      </div>
      {customCrops.length === 0 ? (
        <div className="empty">No custom crops yet. Add one to use it when planting.</div>
      ) : (
        <div className="tank-grid">
          {customCrops.map((c) => (
            <div className="tank-card" key={c.id}>
              <div className="tank-head">
                <span className="tank-name">{c.crop_name}</span>
                <span className="tank-type">{cap(c.category)}</span>
              </div>
              <div className="tank-rows">
                <div><span>Spacing</span><b>{c.plant_spacing ?? '—'} cm</b></div>
                <div><span>To harvest</span><b>{c.growth_days ?? '—'} d</b></div>
                <div><span>Target EC</span><b>{c.target_ec ?? '—'}</b></div>
                <div><span>Difficulty</span><b style={{ textTransform: 'capitalize' }}>{c.difficulty ?? '—'}</b></div>
              </div>
              <div className="tank-actions">
                <button className="tank-action-btn" onClick={() => setCropModal({ crop: c })}>Edit</button>
                <button className="tank-action-btn danger" onClick={() => setConfirmDel(c)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Seed varieties */}
      <h2 className="section-title">Seed varieties</h2>
      <form className="seed-add" onSubmit={onAddSeed}>
        <select value={svCrop} onChange={(e) => setSvCrop(e.target.value)} aria-label="Crop">
          <option value="">Crop…</option>
          {refCrops.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <input type="text" value={svName} onChange={(e) => setSvName(e.target.value)} placeholder="Variety name" aria-label="Variety name" />
        <button type="submit" className="row-btn" disabled={addSeed.isPending}>Add</button>
      </form>
      {svError && <div className="wq-error" style={{ marginTop: 8 }}>{svError}</div>}
      {seeds.length === 0 ? (
        <div className="empty">No seed varieties recorded yet.</div>
      ) : (
        <div className="variety-groups">
          {groupVarieties(seeds).map(([crop, vs]) => (
            <div className="variety-group" key={crop}>
              <span className="variety-crop">{prettyCrop(crop)}</span>
              <div className="variety-chips">
                {vs.map((v) => (
                  <span className="variety-chip" key={v.id}>
                    {v.variety_name}
                    <button aria-label={`Remove ${v.variety_name}`} onClick={() => delSeed.mutate(v.id)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Crop reference */}
      <h2 className="section-title">Crop reference</h2>
      <div className="wq-table-wrap">
        <table className="wq-table op-table">
          <thead>
            <tr>
              <th>Crop</th>
              <th>Category</th>
              <th>To harvest</th>
              <th>Spacing</th>
              <th>EC range</th>
            </tr>
          </thead>
          <tbody>
            {refCrops.map((c) => (
              <tr key={c.code}>
                <td className="op-text">{c.name}</td>
                <td className="op-text">{c.category_name ?? '—'}</td>
                <td>{c.days_to_harvest != null ? `${c.days_to_harvest} d` : '—'}</td>
                <td>{c.plant_spacing_cm != null ? `${c.plant_spacing_cm} cm` : '—'}</td>
                <td>{c.default_ec_min != null && c.default_ec_max != null ? `${c.default_ec_min}–${c.default_ec_max}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
