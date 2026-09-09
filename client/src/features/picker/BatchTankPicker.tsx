import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { canCaptureSystem } from '../systems/api'
import { fetchBatches } from '../plants/batches'
import { fetchFishInventory } from '../fish/api'
import { fetchSeedlings } from '../seedlings/api'
import { prettyCrop } from '../plants/api'
import { batchScanUrl, seedlingScanUrl } from '../plants/batchQr'
import { tankScanUrl } from '../fish/tankQr'
import '../dashboard/dashboard.css'
import '../plants/plants.css'
import '../plants/scan.css'
import './picker.css'

// A scan deep-link carries an origin (so a phone camera can open it directly);
// strip that back off for an in-app react-router navigation.
function toPath(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/, '')
}

type Kind = 'bed' | 'seedling' | 'fish'

type Item = {
  key: string
  kind: Kind
  label: string
  cropLabel: string
  sub: string
  groupKey: string
  groupLabel: string
  path: string
}

const KIND_TEXT: Record<Kind, { title: string; search: string; empty: string }> = {
  bed: { title: 'Choose a batch', search: 'Search batch…', empty: 'No active batches found.' },
  seedling: { title: 'Choose a nursery batch', search: 'Search batch…', empty: 'No nursery batches found.' },
  fish: { title: 'Choose a tank', search: 'Search tank…', empty: 'No tanks found.' },
}

// The scan fallback (Operator Access proposal, §05/§08): a filtered, searchable
// list of the account's batches and tanks that lands on the exact same action
// sheet a scan would — for a faded, missing, or not-yet-printed label. Built as
// a shared component per the proposal's decision, not gated to operator
// sessions — anyone can reach it from Scan.
//
// An optional ?kind=bed|seedling|fish narrows it to one kind of target and
// changes the wording — used by the operator Log tiles that already know
// what they're after (e.g. "Harvest" only wants bed batches), so the list
// isn't cluttered with items that don't even offer that action.
export function BatchTankPicker() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const kindParam = params.get('kind') as Kind | null
  const { allSystems, farms } = useSystems()

  // Only systems the account can actually act on — a view-only share would
  // just 403 on the resulting action sheet.
  const systems = useMemo(() => allSystems.filter(canCaptureSystem), [allSystems])
  const farmIds = useMemo(() => {
    const set = new Set<string>()
    for (const s of systems) if (s.farm_id) set.add(s.farm_id)
    return [...set]
  }, [systems])

  const batchQs = useQueries({ queries: systems.map((s) => ({ queryKey: ['plant-batches', s.id], queryFn: () => fetchBatches(s.id) })) })
  const tankQs = useQueries({ queries: systems.map((s) => ({ queryKey: ['fish-inventory', s.id], queryFn: () => fetchFishInventory(s.id) })) })
  const seedlingQs = useQueries({ queries: farmIds.map((f) => ({ queryKey: ['seedlings', f], queryFn: () => fetchSeedlings(f) })) })
  const loading = [...batchQs, ...tankQs, ...seedlingQs].some((q) => q.isLoading)

  const items = useMemo<Item[]>(() => {
    const out: Item[] = []
    systems.forEach((s, i) => {
      for (const b of batchQs[i]?.data ?? []) {
        if (b.remaining <= 0) continue
        out.push({
          key: `bed:${s.id}:${b.batch_id}`,
          kind: 'bed',
          label: b.batch_id,
          cropLabel: prettyCrop(b.crop_type),
          sub: b.bed_name ?? (b.bed_number != null ? `Bed ${b.bed_number}` : 'Unassigned'),
          groupKey: s.id,
          groupLabel: s.system_name,
          path: toPath(batchScanUrl(s.id, b.batch_id)),
        })
      }
      for (const t of tankQs[i]?.data ?? []) {
        out.push({
          key: `fish:${s.id}:${t.fish_tank_id}`,
          kind: 'fish',
          label: `Tank ${t.tank_number}`,
          cropLabel: t.tank_fish_type ? t.tank_fish_type[0].toUpperCase() + t.tank_fish_type.slice(1) : 'Fish',
          sub: `${t.current_count ?? 0} fish`,
          groupKey: s.id,
          groupLabel: s.system_name,
          path: toPath(tankScanUrl(s.id, t.fish_tank_id)),
        })
      }
    })
    farmIds.forEach((f, i) => {
      const farmName = farms.find((fm) => fm.id === f)?.name ?? 'Nursery'
      for (const sd of seedlingQs[i]?.data ?? []) {
        if (sd.status === 'transplanted') continue
        out.push({
          key: `seedling:${f}:${sd.id}`,
          kind: 'seedling',
          label: sd.batch_number ?? `Seedling #${sd.id}`,
          cropLabel: sd.crop_name ? prettyCrop(sd.crop_name) : 'Crop',
          sub: 'Nursery',
          groupKey: `farm:${f}`,
          groupLabel: `${farmName} · Nursery`,
          path: toPath(seedlingScanUrl(f, sd.id)),
        })
      }
    })
    return out.sort((a, b) => a.groupLabel.localeCompare(b.groupLabel) || a.label.localeCompare(b.label, undefined, { numeric: true }))
  }, [systems, batchQs, tankQs, farmIds, seedlingQs, farms])

  const scoped = useMemo(() => (kindParam ? items.filter((it) => it.kind === kindParam) : items), [items, kindParam])

  const [groupFilter, setGroupFilter] = useState('all')
  const [cropFilter, setCropFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Only offer a filter that's actually worth showing — a single-system
  // operator never sees a system picker at all (proposal §05).
  const groupOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const it of scoped) map.set(it.groupKey, it.groupLabel)
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [scoped])
  const cropOptions = useMemo(() => [...new Set(scoped.map((it) => it.cropLabel))].sort((a, b) => a.localeCompare(b)), [scoped])

  const filtered = scoped.filter((it) => {
    if (groupFilter !== 'all' && it.groupKey !== groupFilter) return false
    if (cropFilter !== 'all' && it.cropLabel !== cropFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!it.label.toLowerCase().includes(q) && !it.cropLabel.toLowerCase().includes(q)) return false
    }
    return true
  })

  const text = kindParam ? KIND_TEXT[kindParam] : { title: 'Choose manually', search: 'Search batch or tank…', empty: 'No active batches or tanks found.' }
  const backTo = kindParam ? '/log' : '/scan'
  const backLabel = kindParam ? '‹ Back to Log' : '‹ Back to scan'

  return (
    <div className="scan-wrap">
      <div className="scan-topline"><Link to={backTo} className="link-btn">{backLabel}</Link></div>
      <h2 className="section-title" style={{ marginTop: 0 }}>{text.title}</h2>

      <input
        className="crop-search"
        type="search"
        placeholder={text.search}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {(groupOptions.length > 1 || cropOptions.length > 1) && (
        <div className="pick-filters">
          {groupOptions.length > 1 && (
            <select className="pick-select" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} aria-label="System">
              <option value="all">All systems</option>
              {groupOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          )}
          {cropOptions.length > 1 && (
            <select className="pick-select" value={cropFilter} onChange={(e) => setCropFilter(e.target.value)} aria-label="Crop or species">
              <option value="all">All crops &amp; species</option>
              {cropOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      )}

      {loading && scoped.length === 0 ? (
        <div className="empty">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">{scoped.length === 0 ? text.empty : 'Nothing matches.'}</div>
      ) : (
        <div className="pick-list">
          {filtered.map((it) => (
            <button key={it.key} type="button" className="pick-row" onClick={() => navigate(it.path)}>
              <span className="pick-icon" aria-hidden>{it.kind === 'fish' ? '🐟' : '🌱'}</span>
              <span className="pick-text">
                <span className="pick-label">{it.label}</span>
                <span className="pick-sub">{it.cropLabel} · {it.sub}{groupOptions.length > 1 ? ` · ${it.groupLabel}` : ''}</span>
              </span>
              <span className="pick-chevron" aria-hidden>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
