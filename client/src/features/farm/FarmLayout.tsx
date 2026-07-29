import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory, type FishTank } from '../fish/api'
import { fetchGrowBedConfigs, type GrowBedConfig } from '../growbeds/api'
import { fetchBatches, type Batch } from '../plants/batches'
import { Modal } from '../../components/Modal'
import '../dashboard/dashboard.css'
import '../fish/fish.css'
import '../settings/settings.css'
import './farm.css'

// Tanks are drawn at a larger scale than beds (as in the old app) so their real
// circular footprint reads clearly next to the rectangular beds.
const PX_M_TANK = 75
const PX_M_BED = 50
const GAP = 28
const PAD = 28
const MAX_ROW = 860
const TANK_HEIGHT_M = 1.2 // standard assumed tank height for the volume→diameter calc
const M2_PER_PLANT = 0.04 // 20cm × 20cm

const CROP_COLORS = ['#4f9d3a', '#2fabc6', '#8e5bd0', '#e0803a', '#c0392b', '#1aa5a5', '#c9a227', '#334e9d']

type TankNode = { kind: 'tank'; tank: FishTank; x: number; y: number; d: number }
type BedBlock = { batch: Batch; x: number; w: number; color: string }
type BedNode = {
  kind: 'bed'
  bed: GrowBedConfig
  x: number
  y: number
  w: number
  h: number
  capacity: number
  planted: number
  blocks: BedBlock[]
}
type Layout = { tanks: TankNode[]; beds: BedNode[]; width: number; height: number }

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

function computeLayout(tanks: FishTank[], beds: GrowBedConfig[], batches: Batch[]): Layout {
  let x = PAD
  let y = PAD
  let rowH = 0
  let maxX = 0

  const tankNodes: TankNode[] = tanks
    .slice()
    .sort((a, b) => (a.tank_number ?? 0) - (b.tank_number ?? 0))
    .map((tank) => {
      const d = tankDiameterPx(tankM3(tank))
      if (x + d > MAX_ROW && x > PAD) {
        x = PAD
        y += rowH + GAP
        rowH = 0
      }
      const node: TankNode = { kind: 'tank', tank, x, y, d }
      x += d + GAP
      rowH = Math.max(rowH, d)
      maxX = Math.max(maxX, x - GAP)
      return node
    })

  // New band for the beds.
  y += rowH + GAP * 1.4
  x = PAD
  rowH = 0

  const bedNodes: BedNode[] = beds
    .slice()
    .sort((a, b) => (a.bed_number ?? 0) - (b.bed_number ?? 0))
    .map((bed) => {
      const w = Math.max(60, (bed.length_meters ?? 2) * PX_M_BED)
      const h = Math.max(44, (bed.width_meters ?? 1.2) * PX_M_BED)
      if (x + w > MAX_ROW && x > PAD) {
        x = PAD
        y += rowH + GAP
        rowH = 0
      }

      const capacity = bedCapacity(bed)
      const bedBatches = batches.filter((b) => Number(b.grow_bed_id) === bed.id && b.remaining > 0)
      const planted = bedBatches.reduce((n, b) => n + b.remaining, 0)

      // Fill blocks left→right, each proportional to its share of capacity.
      const inner = w - 6
      let bx = x + 3
      const blocks: BedBlock[] = bedBatches.map((batch, i) => {
        const bw = Math.max(3, Math.min(inner - (bx - (x + 3)), (batch.remaining / capacity) * inner))
        const block: BedBlock = { batch, x: bx, w: bw, color: CROP_COLORS[i % CROP_COLORS.length] }
        bx += bw
        return block
      })

      const node: BedNode = { kind: 'bed', bed, x, y, w, h, capacity, planted, blocks }
      x += w + GAP
      rowH = Math.max(rowH, h)
      maxX = Math.max(maxX, x - GAP)
      return node
    })

  return { tanks: tankNodes, beds: bedNodes, width: maxX + PAD, height: y + rowH + PAD }
}

export function FarmLayout() {
  const { activeId, activeSystem } = useSystems()
  const [zoom, setZoom] = useState(1)
  const [showLabels, setShowLabels] = useState(true)
  const [selected, setSelected] = useState<TankNode | BedNode | null>(null)
  const [hover, setHover] = useState<{ text: string[]; x: number; y: number } | null>(null)

  const tanksQ = useQuery({ queryKey: ['fish-inventory', activeId], queryFn: () => fetchFishInventory(activeId as string), enabled: !!activeId })
  const bedsQ = useQuery({ queryKey: ['grow-bed-configs', activeId], queryFn: () => fetchGrowBedConfigs(activeId as string), enabled: !!activeId })
  const batchesQ = useQuery({ queryKey: ['batches', activeId], queryFn: () => fetchBatches(activeId as string), enabled: !!activeId })

  const layout = useMemo(
    () => computeLayout(tanksQ.data ?? [], bedsQ.data ?? [], batchesQ.data ?? []),
    [tanksQ.data, bedsQ.data, batchesQ.data],
  )

  if (!activeId) return <div className="empty">Select a system to see its layout.</div>

  const loading = tanksQ.isLoading || bedsQ.isLoading || batchesQ.isLoading
  const nothing = !loading && layout.tanks.length === 0 && layout.beds.length === 0

  function onEnter(e: React.MouseEvent, text: string[]) {
    const host = (e.currentTarget as SVGElement).closest('.farm-viewport') as HTMLElement | null
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
        <div className="seg">
          <button type="button" className="seg-btn" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(2)))} aria-label="Zoom out">−</button>
          <button type="button" className="seg-btn" onClick={() => setZoom(1)} aria-label="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button type="button" className="seg-btn" onClick={() => setZoom((z) => Math.min(2, +(z + 0.2).toFixed(2)))} aria-label="Zoom in">+</button>
        </div>
        <label className="farm-labels-toggle">
          <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
          Labels
        </label>
        <div className="farm-legend">
          <span className="farm-legend-item"><span className="farm-swatch tank" /> Tanks</span>
          <span className="farm-legend-item"><span className="farm-swatch planted" /> Planted beds</span>
          <span className="farm-legend-item"><span className="farm-swatch unplanted" /> Empty beds</span>
        </div>
      </div>

      {nothing ? (
        <div className="empty">No tanks or grow beds configured for this system yet.</div>
      ) : (
        <div className="farm-viewport" onMouseLeave={() => setHover(null)}>
          <svg
            className="farm-svg"
            width={layout.width * zoom}
            height={layout.height * zoom}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            role="img"
            aria-label="Farm layout"
          >
            {/* Beds */}
            {layout.beds.map((n) => {
              const active = n.planted > 0
              const pct = n.capacity > 0 ? Math.round((n.planted / n.capacity) * 100) : 0
              return (
                <g
                  key={`bed-${n.bed.id}`}
                  className="farm-node"
                  onClick={() => setSelected(n)}
                  onMouseMove={(e) =>
                    onEnter(e, [
                      n.bed.bed_name || `Bed ${n.bed.bed_number}`,
                      `${n.bed.bed_type ?? 'bed'} · ${n.bed.length_meters ?? '?'}×${n.bed.width_meters ?? '?'} m`,
                      active ? `${n.planted}/${n.capacity} plants · ${pct}% full` : 'Empty',
                    ])
                  }
                >
                  <rect
                    x={n.x}
                    y={n.y}
                    width={n.w}
                    height={n.h}
                    rx={8}
                    className={`farm-bed ${active ? 'active' : 'idle'}`}
                  />
                  {n.blocks.map((b, i) => (
                    <rect key={i} x={b.x} y={n.y + 3} width={b.w} height={n.h - 6} rx={4} fill={b.color} opacity={0.85} />
                  ))}
                  {showLabels && (
                    <text x={n.x + n.w / 2} y={n.y + n.h / 2} className="farm-bed-label" textAnchor="middle" dominantBaseline="middle">
                      {n.bed.bed_name || `Bed ${n.bed.bed_number}`}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Tanks */}
            {layout.tanks.map((n) => {
              const dens = n.tank.density_kg_m3 ?? 0
              return (
                <g
                  key={`tank-${n.tank.fish_tank_id}`}
                  className="farm-node"
                  onClick={() => setSelected(n)}
                  onMouseMove={(e) =>
                    onEnter(e, [
                      `Tank ${n.tank.tank_number}`,
                      `${n.tank.tank_fish_type ?? 'fish'} · ${n.tank.current_count ?? 0} fish`,
                      `${dens.toFixed(1)} kg/m³`,
                    ])
                  }
                >
                  <circle cx={n.x + n.d / 2} cy={n.y + n.d / 2} r={n.d / 2} className="farm-tank" />
                  {showLabels && (
                    <>
                      <text x={n.x + n.d / 2} y={n.y + n.d / 2 - 6} className="farm-tank-label" textAnchor="middle">
                        Tank {n.tank.tank_number}
                      </text>
                      <text x={n.x + n.d / 2} y={n.y + n.d / 2 + 12} className="farm-tank-sub" textAnchor="middle">
                        {n.tank.current_count ?? 0} fish
                      </text>
                    </>
                  )}
                </g>
              )
            })}
          </svg>

          {hover && (
            <div className="farm-tip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
              {hover.text.map((t, i) => (
                <div key={i} className={i === 0 ? 'farm-tip-title' : 'farm-tip-line'}>{t}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && <DetailModal node={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function DetailModal({ node, onClose }: { node: TankNode | BedNode; onClose: () => void }) {
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
      </Modal>
    )
  }
  const b = node.bed
  const pct = node.capacity > 0 ? Math.round((node.planted / node.capacity) * 100) : 0
  return (
    <Modal title={b.bed_name || `Bed ${b.bed_number}`} onClose={onClose}>
      <dl className="farm-dl">
        <div><dt>Type</dt><dd>{b.bed_type ?? '—'}</dd></div>
        <div><dt>Dimensions</dt><dd>{b.length_meters ?? '?'} × {b.width_meters ?? '?'} m</dd></div>
        <div><dt>Capacity</dt><dd>{node.capacity} plants</dd></div>
        <div><dt>Planted</dt><dd>{node.planted} plants · {pct}% full</dd></div>
      </dl>
      {node.blocks.length > 0 ? (
        <ul className="farm-batch-list">
          {node.blocks.map((blk, i) => (
            <li key={i}>
              <span className="farm-batch-dot" style={{ background: blk.color }} />
              {blk.batch.crop_type}
              <b>{blk.batch.remaining}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="set-sub" style={{ marginBottom: 0 }}>No active plantings in this bed.</p>
      )}
    </Modal>
  )
}
