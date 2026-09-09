import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory, tankMaxDensity } from './api'
import { fmt } from './fishShared'
import { TankActionModal, type TankAction } from './TankActionModal'
import '../plants/plants.css'
import '../plants/scan.css'

// Landing for a scanned tank label (/t?s=&tank=): resolves the tank and offers
// the actions an operator would take on it, reusing the existing action modal.
export function TankScan() {
  const [params] = useSearchParams()
  const s = params.get('s')
  const tankParam = params.get('tank')
  const tankId = tankParam != null && Number.isFinite(Number(tankParam)) ? Number(tankParam) : null
  const { setActiveId } = useSystems()

  useEffect(() => {
    if (s) setActiveId(s)
  }, [s, setActiveId])

  if (!s || tankId == null) {
    return (
      <div className="scan-wrap">
        <div className="scan-topline"><Link to="/scan" className="link-btn">‹ Scan another</Link></div>
        <div className="empty">This isn’t a valid tank label.</div>
      </div>
    )
  }
  return <ResolvedTankScan systemId={s} tankId={tankId} />
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="scan-fact"><span className="k">{k}</span><span className="v">{v}</span></div>
}

function ResolvedTankScan({ systemId, tankId }: { systemId: string; tankId: number }) {
  const { activeId } = useSystems()
  const ready = activeId === systemId
  const { data: tanks = [], isLoading } = useQuery({
    queryKey: ['fish-inventory', systemId],
    queryFn: () => fetchFishInventory(systemId),
    enabled: ready,
  })
  const tank = tanks.find((t) => t.fish_tank_id === tankId)
  const [action, setAction] = useState<TankAction | null>(null)

  if (!ready || isLoading) {
    return (
      <div className="scan-wrap">
        <div className="scan-topline"><Link to="/scan" className="link-btn">‹ Scan another</Link></div>
        <div className="empty">Loading tank…</div>
      </div>
    )
  }
  if (!tank) {
    return (
      <div className="scan-wrap">
        <div className="scan-topline"><Link to="/scan" className="link-btn">‹ Scan another</Link></div>
        <div className="empty">That tank isn’t in this system anymore.</div>
      </div>
    )
  }

  const available = tank.current_count ?? 0
  return (
    <div className="scan-wrap">
      <div className="scan-topline"><Link to="/scan" className="link-btn">‹ Scan another</Link></div>
      <div className="scan-card">
        <div className="scan-head">
          <div className="scan-batch">Tank {tank.tank_number}</div>
          <div className="scan-title" style={{ textTransform: 'capitalize' }}>{tank.tank_fish_type ?? 'Fish tank'}</div>
        </div>
        <div className="scan-facts">
          <Fact k="Count" v={fmt(tank.current_count)} />
          <Fact k="Avg weight" v={`${fmt(tank.average_weight)} g`} />
          <Fact k="Biomass" v={`${fmt(tank.biomass_kg, 1)} kg`} />
          <Fact k="Density" v={`${fmt(tank.density_kg_m3, 2)} / ${tankMaxDensity(tank)} kg/m³`} />
        </div>
        <div className="scan-actions">
          <button className="scan-btn primary" onClick={() => setAction('weight')}>Update weight</button>
          <button className="scan-btn" onClick={() => setAction('add')}>Add fish</button>
          <button className="scan-btn" disabled={available <= 0} onClick={() => setAction('mortality')}>Record loss</button>
          <button className="scan-btn" disabled={available <= 0} onClick={() => setAction('move')}>Move</button>
          <button className="scan-btn" disabled={available <= 0} onClick={() => setAction('harvest')}>Harvest</button>
          <Link className="scan-btn ghost" to="/fish/tanks">Open in Tank Information</Link>
        </div>
      </div>
      {action && <TankActionModal systemId={systemId} tank={tank} tanks={tanks} action={action} onClose={() => setAction(null)} />}
    </div>
  )
}
