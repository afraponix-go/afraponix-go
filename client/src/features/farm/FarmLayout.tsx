import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory, type FishTank } from '../fish/api'
import { fetchGrowBedConfigs, type GrowBedConfig } from '../growbeds/api'
import { fetchBatches, type Batch } from '../plants/batches'
import { TankActionModal, type TankAction } from '../fish/TankActionModal'
import { NewPlantingModal } from '../plants/NewPlantingModal'
import { HarvestModal } from '../plants/HarvestModal'
import { MoveBatchModal } from '../plants/MoveBatchModal'
import { Modal } from '../../components/Modal'
import '../dashboard/dashboard.css'
import '../fish/fish.css'
import '../settings/settings.css'
import './farm.css'

// Tanks are drawn to scale from their real volume; beds are shown as full-width
// fill bars (one per row), so tank scale and bed capacity both read clearly.
const PX_M_TANK = 75
const TANK_GAP = 28
const TANK_PAD = 28
const TANK_MAX_ROW = 860
const TANK_HEIGHT_M = 1.2 // standard assumed tank height for volume→diameter
const M2_PER_PLANT = 0.04 // 20cm × 20cm

const CROP_COLORS = ['#4f9d3a', '#2fabc6', '#8e5bd0', '#e0803a', '#c0392b', '#1aa5a5', '#c9a227', '#334e9d']

type TankNode = { kind: 'tank'; tank: FishTank; x: number; y: number; d: number }
type BedSegment = { batch: Batch; color: string }
type BedView = { kind: 'bed'; bed: GrowBedConfig; capacity: number; planted: number; pct: number; segments: BedSegment[] }

// Quick actions launched from a detail modal, reusing the existing action modals.
type FarmAction =
  | { kind: 'plant'; bedId: number }
  | { kind: 'harvest'; batch: Batch }
  | { kind: 'move-batch'; batch: Batch }
  | { kind: 'tank'; tank: FishTank; action: TankAction }

function tankM3(t: FishTank): number {
  return (t.size_m3 && t.size_m3 > 0 ? t.size_m3 : (t.volume_liters ?? 0) / 1000) || 0
}
function tankDiameterPx(m3: number): number {
  if (m3 <= 0) return 56
  const dM = 2 * Math.sqrt(m3 / (Math.PI * TANK_HEIGHT_M))
  return Math.max(52, Math.min(190, dM * PX_M_TANK))
}
function bedCapacity(bed: GrowBedConfig): number {
  if (bed.plant_capacity && bed.plant_capacity > 0) return bed.plant_capacity
  const eq = bed.equivalent_m2 ?? (bed.length_meters ?? 2) * (bed.width_meters ?? 1.2)
  return Math.max(1, Math.floor(eq / M2_PER_PLANT))
}

function layoutTanks(tanks: FishTank[]): { nodes: TankNode[]; width: number; height: number } {
  let x = TANK_PAD
  let y = TANK_PAD
  let rowH = 0
  let maxX = 0
  const nodes = tanks
    .slice()
    .sort((a, b) => (a.tank_number ?? 0) - (b.tank_number ?? 0))
    .map((tank) => {
      const d = tankDiameterPx(tankM3(tank))
      if (x + d > TANK_MAX_ROW && x > TANK_PAD) {
        x = TANK_PAD
        y += rowH + TANK_GAP
        rowH = 0
      }
      const node: TankNode = { kind: 'tank', tank, x, y, d }
      x += d + TANK_GAP
      rowH = Math.max(rowH, d)
      maxX = Math.max(maxX, x - TANK_GAP)
      return node
    })
  return { nodes, width: maxX + TANK_PAD, height: y + rowH + TANK_PAD }
}

function buildBedViews(beds: GrowBedConfig[], batches: Batch[]): BedView[] {
  return beds
    .slice()
    .sort((a, b) => (a.bed_number ?? 0) - (b.bed_number ?? 0))
    .map((bed) => {
      const capacity = bedCapacity(bed)
      const bedBatches = batches.filter((b) => Number(b.grow_bed_id) === bed.id && b.remaining > 0)
      const planted = bedBatches.reduce((n, b) => n + b.remaining, 0)
      const segments: BedSegment[] = bedBatches.map((batch, i) => ({ batch, color: CROP_COLORS[i % CROP_COLORS.length] }))
      const pct = capacity > 0 ? Math.min(100, Math.round((planted / capacity) * 100)) : 0
      return { kind: 'bed', bed, capacity, planted, pct, segments }
    })
}

export function FarmLayout() {
  const { activeId, activeSystem } = useSystems()
  const [view, setView] = useState<'fish' | 'plants'>('fish')
  const [zoom, setZoom] = useState(1)
  const [showLabels, setShowLabels] = useState(true)
  const [selected, setSelected] = useState<TankNode | BedView | null>(null)
  const [action, setAction] = useState<FarmAction | null>(null)
  const [hover, setHover] = useState<{ text: string[]; x: number; y: number } | null>(null)

  const tanksQ = useQuery({ queryKey: ['fish-inventory', activeId], queryFn: () => fetchFishInventory(activeId as string), enabled: !!activeId })
  const bedsQ = useQuery({ queryKey: ['grow-bed-configs', activeId], queryFn: () => fetchGrowBedConfigs(activeId as string), enabled: !!activeId })
  const batchesQ = useQuery({ queryKey: ['batches', activeId], queryFn: () => fetchBatches(activeId as string), enabled: !!activeId })

  const tankLayout = useMemo(() => layoutTanks(tanksQ.data ?? []), [tanksQ.data])
  const bedViews = useMemo(() => buildBedViews(bedsQ.data ?? [], batchesQ.data ?? []), [bedsQ.data, batchesQ.data])

  if (!activeId) return <div className="empty">Select a system to see its layout.</div>

  function onEnter(e: React.MouseEvent, text: string[]) {
    const host = (e.currentTarget as Element).closest('.farm-viewport') as HTMLElement | null
    if (!host) return
    const r = host.getBoundingClientRect()
    setHover({ text, x: e.clientX - r.left, y: e.clientY - r.top })
  }

  return (
    <div>
      <div className="dash-head">
        <h1>Farm Layout</h1>
        <span className="dash-sub">{activeSystem?.system_name}</span>
      </div>

      <div className="farm-toolbar">
        <div className="seg" role="tablist" aria-label="Layout view">
          <button type="button" role="tab" aria-selected={view === 'fish'} className={`seg-btn${view === 'fish' ? ' active' : ''}`} onClick={() => setView('fish')}>Fish</button>
          <button type="button" role="tab" aria-selected={view === 'plants'} className={`seg-btn${view === 'plants' ? ' active' : ''}`} onClick={() => setView('plants')}>Plants</button>
        </div>

        {view === 'fish' && (
          <>
            <div className="seg">
              <button type="button" className="seg-btn" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(2)))} aria-label="Zoom out">−</button>
              <button type="button" className="seg-btn" onClick={() => setZoom(1)} aria-label="Reset zoom">{Math.round(zoom * 100)}%</button>
              <button type="button" className="seg-btn" onClick={() => setZoom((z) => Math.min(2, +(z + 0.2).toFixed(2)))} aria-label="Zoom in">+</button>
            </div>
            <label className="farm-labels-toggle">
              <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
              Labels
            </label>
          </>
        )}

        <div className="farm-legend">
          {view === 'fish' ? (
            <span className="farm-legend-item"><span className="farm-swatch tank" /> Fish tanks</span>
          ) : (
            <>
              <span className="farm-legend-item"><span className="farm-swatch planted" /> Planted</span>
              <span className="farm-legend-item"><span className="farm-swatch unplanted" /> Empty</span>
            </>
          )}
        </div>
      </div>

      {view === 'fish' ? (
        tankLayout.nodes.length === 0 ? (
          <div className="empty">No fish tanks configured for this system yet.</div>
        ) : (
          <div className="farm-viewport" onMouseLeave={() => setHover(null)}>
            <svg className="farm-svg" width={tankLayout.width * zoom} height={tankLayout.height * zoom} viewBox={`0 0 ${tankLayout.width} ${tankLayout.height}`} role="img" aria-label="Fish tank layout">
              {tankLayout.nodes.map((n) => (
                <g
                  key={`tank-${n.tank.fish_tank_id}`}
                  className="farm-node"
                  onClick={() => setSelected(n)}
                  onMouseMove={(e) => onEnter(e, [`Tank ${n.tank.tank_number}`, `${n.tank.tank_fish_type ?? 'fish'} · ${n.tank.current_count ?? 0} fish`, `${(n.tank.density_kg_m3 ?? 0).toFixed(1)} kg/m³`])}
                >
                  <circle cx={n.x + n.d / 2} cy={n.y + n.d / 2} r={n.d / 2} className="farm-tank" />
                  {showLabels && (
                    <>
                      <text x={n.x + n.d / 2} y={n.y + n.d / 2 - 6} className="farm-tank-label" textAnchor="middle">Tank {n.tank.tank_number}</text>
                      <text x={n.x + n.d / 2} y={n.y + n.d / 2 + 12} className="farm-tank-sub" textAnchor="middle">{n.tank.current_count ?? 0} fish</text>
                    </>
                  )}
                </g>
              ))}
            </svg>
            {hover && (
              <div className="farm-tip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
                {hover.text.map((t, i) => (
                  <div key={i} className={i === 0 ? 'farm-tip-title' : 'farm-tip-line'}>{t}</div>
                ))}
              </div>
            )}
          </div>
        )
      ) : bedViews.length === 0 ? (
        <div className="empty">No grow beds configured for this system yet.</div>
      ) : (
        <div className="bed-bars">
          {bedViews.map((bv) => (
            <button key={bv.bed.id} type="button" className={`bed-bar${bv.planted > 0 ? ' active' : ''}`} onClick={() => setSelected(bv)}>
              <div className="bed-bar-head">
                <span className="bed-bar-name">{bv.bed.bed_name || `Bed ${bv.bed.bed_number}`}</span>
                <span className="bed-bar-sub">
                  {bv.bed.bed_type ?? 'bed'}
                  {bv.bed.length_meters && bv.bed.width_meters ? ` · ${bv.bed.length_meters}×${bv.bed.width_meters} m` : ''}
                </span>
                <span className="bed-bar-stat">{bv.planted}/{bv.capacity} · {bv.pct}%</span>
              </div>
              <div className="bed-bar-track">
                {bv.segments.map((s, i) => (
                  <span
                    key={i}
                    className="bed-bar-seg"
                    style={{ width: `${Math.max(1, (s.batch.remaining / bv.capacity) * 100)}%`, background: s.color }}
                    title={`${s.batch.crop_type}: ${s.batch.remaining}`}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <DetailModal
          node={selected}
          onClose={() => setSelected(null)}
          onAction={(a) => {
            setSelected(null)
            setAction(a)
          }}
        />
      )}

      {action?.kind === 'plant' && <NewPlantingModal initialBedId={action.bedId} onClose={() => setAction(null)} />}
      {action?.kind === 'harvest' && <HarvestModal batch={action.batch} onClose={() => setAction(null)} />}
      {action?.kind === 'move-batch' && <MoveBatchModal batch={action.batch} onClose={() => setAction(null)} />}
      {action?.kind === 'tank' && (
        <TankActionModal systemId={activeId} tank={action.tank} tanks={tanksQ.data ?? []} action={action.action} onClose={() => setAction(null)} />
      )}
    </div>
  )
}

function DetailModal({
  node,
  onClose,
  onAction,
}: {
  node: TankNode | BedView
  onClose: () => void
  onAction: (a: FarmAction) => void
}) {
  if (node.kind === 'tank') {
    const t = node.tank
    return (
      <Modal title={`Tank ${t.tank_number}`} onClose={onClose}>
        <dl className="farm-dl">
          <div><dt>Fish type</dt><dd>{t.tank_fish_type ?? '—'}</dd></div>
          <div><dt>Fish count</dt><dd>{t.current_count ?? 0}</dd></div>
          <div><dt>Avg weight</dt><dd>{t.average_weight != null ? `${t.average_weight} g` : '—'}</dd></div>
          <div><dt>Volume</dt><dd>{t.volume_liters != null ? `${t.volume_liters} L` : '—'}</dd></div>
          <div><dt>Density</dt><dd>{(t.density_kg_m3 ?? 0).toFixed(2)} kg/m³</dd></div>
        </dl>
        <div className="farm-actions">
          <button className="farm-act" type="button" onClick={() => onAction({ kind: 'tank', tank: t, action: 'add' })}>+ Add fish</button>
          <button className="farm-act" type="button" onClick={() => onAction({ kind: 'tank', tank: t, action: 'harvest' })}>Harvest</button>
          <button className="farm-act" type="button" onClick={() => onAction({ kind: 'tank', tank: t, action: 'move' })}>Move</button>
          <button className="farm-act" type="button" onClick={() => onAction({ kind: 'tank', tank: t, action: 'weight' })}>Weigh</button>
          <button className="farm-act danger" type="button" onClick={() => onAction({ kind: 'tank', tank: t, action: 'mortality' })}>Loss</button>
        </div>
      </Modal>
    )
  }
  const b = node.bed
  return (
    <Modal title={b.bed_name || `Bed ${b.bed_number}`} onClose={onClose}>
      <dl className="farm-dl">
        <div><dt>Type</dt><dd>{b.bed_type ?? '—'}</dd></div>
        <div><dt>Dimensions</dt><dd>{b.length_meters ?? '?'} × {b.width_meters ?? '?'} m</dd></div>
        <div><dt>Capacity</dt><dd>{node.capacity} plants</dd></div>
        <div><dt>Planted</dt><dd>{node.planted} plants · {node.pct}% full</dd></div>
      </dl>

      {node.segments.length > 0 ? (
        <ul className="farm-batch-list">
          {node.segments.map((s, i) => (
            <li key={i}>
              <span className="farm-batch-dot" style={{ background: s.color }} />
              <span className="farm-batch-name">{s.batch.crop_type}</span>
              <b>{s.batch.remaining}</b>
              <span className="farm-batch-acts">
                <button className="farm-act sm" type="button" onClick={() => onAction({ kind: 'harvest', batch: s.batch })}>Harvest</button>
                <button className="farm-act sm" type="button" onClick={() => onAction({ kind: 'move-batch', batch: s.batch })}>Move</button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="set-sub" style={{ margin: '0 0 14px' }}>No active plantings in this bed.</p>
      )}

      <div className="farm-actions">
        <button className="farm-act primary" type="button" onClick={() => onAction({ kind: 'plant', bedId: b.id })}>+ Plant here</button>
      </div>
    </Modal>
  )
}
