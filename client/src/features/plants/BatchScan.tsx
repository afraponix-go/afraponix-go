import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchBatches } from './batches'
import { fetchSeedlings, type Seedling } from '../seedlings/api'
import { prettyCrop } from './api'
import { HarvestModal } from './HarvestModal'
import { MoveBatchModal } from './MoveBatchModal'
import { BatchPhotoModal } from './BatchPhotoModal'
import { GerminationModal } from '../seedlings/GerminationModal'
import { TransplantModal } from '../seedlings/TransplantModal'
import { batchScanUrl } from './batchQr'
import './plants.css'
import './scan.css'

// Landing for a scanned label (/b?…): resolves the batch and offers the actions
// an operator would take on it, reusing the existing modals/endpoints.
export function BatchScan() {
  const [params] = useSearchParams()
  const s = params.get('s')
  const b = params.get('b')
  const f = params.get('f')
  const sb = params.get('sb')
  const { setActiveId, setActiveFarmId } = useSystems()

  // Point the app context at whatever was scanned, so the action modals write to
  // the right system/farm.
  useEffect(() => {
    if (s) setActiveId(s)
    if (f) setActiveFarmId(f)
  }, [s, f, setActiveId, setActiveFarmId])

  if (s && b) return <BedBatchScan systemId={s} batchId={b} />
  if (f && sb && Number.isFinite(Number(sb))) return <SeedlingScan farmId={f} seedlingId={Number(sb)} />
  return <ScanShell><div className="empty">This isn’t a valid batch label.</div></ScanShell>
}

function ScanShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="scan-wrap">
      <div className="scan-topline">
        <Link to="/scan" className="link-btn">‹ Scan another</Link>
      </div>
      {children}
    </div>
  )
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="scan-fact"><span className="k">{k}</span><span className="v">{v}</span></div>
}

// ---- Bed (planted) batch: Harvest / Move ----
function BedBatchScan({ systemId, batchId }: { systemId: string; batchId: string }) {
  const { activeId } = useSystems()
  const ready = activeId === systemId
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['plant-batches', systemId],
    queryFn: () => fetchBatches(systemId),
    enabled: ready,
  })
  const batch = batches.find((x) => x.batch_id === batchId)
  const [harvesting, setHarvesting] = useState(false)
  const [moving, setMoving] = useState(false)
  const [photo, setPhoto] = useState(false)

  if (!ready || isLoading) return <ScanShell><div className="empty">Loading batch…</div></ScanShell>
  if (!batch) return <ScanShell><div className="empty">Batch <b>{batchId}</b> isn’t in this system anymore.</div></ScanShell>

  const bed = batch.bed_name ?? (batch.bed_number != null ? `Bed ${batch.bed_number}` : '—')
  return (
    <ScanShell>
      <div className="scan-card">
        <div className="scan-head">
          <div className="scan-batch">{batch.batch_id}</div>
          <div className="scan-title">{prettyCrop(batch.crop_type)}{batch.seed_variety ? ` · ${batch.seed_variety}` : ''}</div>
        </div>
        <div className="scan-facts">
          <Fact k="Bed" v={bed} />
          <Fact k="Remaining" v={batch.remaining.toLocaleString()} />
          <Fact k="Age" v={batch.age_days != null ? `${batch.age_days} d` : '—'} />
          <Fact k="Status" v={batch.status} />
        </div>
        <div className="scan-actions">
          <button className="scan-btn primary" disabled={batch.remaining <= 0} onClick={() => setHarvesting(true)}>Harvest</button>
          <button className="scan-btn" disabled={batch.remaining <= 0} onClick={() => setMoving(true)}>Move</button>
          <button className="scan-btn" onClick={() => setPhoto(true)}>Take photo</button>
          <Link className="scan-btn ghost" to="/plants/plantings">Open in Plantings</Link>
        </div>
      </div>
      {harvesting && <HarvestModal batch={batch} onClose={() => setHarvesting(false)} />}
      {moving && <MoveBatchModal batch={batch} onClose={() => setMoving(false)} />}
      {photo && <BatchPhotoModal systemId={systemId} batchId={batch.batch_id} title={batch.batch_id} cropType={batch.crop_type} onClose={() => setPhoto(false)} />}
    </ScanShell>
  )
}

// ---- Nursery (seedling) batch: germination / transplant, or follow to its bed ----
function SeedlingScan({ farmId, seedlingId }: { farmId: string; seedlingId: number }) {
  const { activeFarmId, systems } = useSystems()
  const navigate = useNavigate()
  const ready = activeFarmId === farmId
  const { data: seedlings = [], isLoading } = useQuery({
    queryKey: ['seedlings', farmId],
    queryFn: () => fetchSeedlings(farmId),
    enabled: ready,
  })
  const s: Seedling | undefined = seedlings.find((x) => x.id === seedlingId)
  const [germ, setGerm] = useState(false)
  const [transplant, setTransplant] = useState(false)

  if (!ready || isLoading) return <ScanShell><div className="empty">Loading batch…</div></ScanShell>
  if (!s) return <ScanShell><div className="empty">That seedling batch no longer exists.</div></ScanShell>

  const transplanted = s.status === 'transplanted'
  return (
    <ScanShell>
      <div className="scan-card">
        <div className="scan-head">
          <div className="scan-batch">{s.batch_number ?? `Seedling #${s.id}`}</div>
          <div className="scan-title">{s.crop_name ?? 'Crop'}{s.seed_variety ? ` · ${s.seed_variety}` : ''}</div>
          <span className="scan-tag">Nursery</span>
        </div>
        <div className="scan-facts">
          <Fact k="Sown" v={s.sow_date} />
          <Fact k="Total" v={s.total_sown.toLocaleString()} />
          <Fact k="Germinated" v={s.germinated_count != null ? s.germinated_count.toLocaleString() : '—'} />
          <Fact k="Status" v={s.status.replace('_', ' ')} />
        </div>
        <div className="scan-actions">
          {!transplanted && <button className="scan-btn primary" onClick={() => setTransplant(true)}>Transplant</button>}
          {!transplanted && <button className="scan-btn" onClick={() => setGerm(true)}>Record germination</button>}
          {transplanted && s.system_id && s.plant_batch_id && (
            <button className="scan-btn primary" onClick={() => navigate(batchScanUrl(s.system_id!, s.plant_batch_id!).replace(/^https?:\/\/[^/]+/, ''))}>
              Open bed batch
            </button>
          )}
          <Link className="scan-btn ghost" to="/plants/seedlings">Open in Seedlings</Link>
        </div>
      </div>
      {germ && <GerminationModal seedling={s} onClose={() => setGerm(false)} />}
      {transplant && <TransplantModal systems={systems} seedling={s} onClose={() => setTransplant(false)} />}
    </ScanShell>
  )
}
