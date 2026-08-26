import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSettingsSystem } from './settingsSystem'
import { updateSystem, isOwnedSystem } from '../systems/api'
import { fetchFishInventory, tankMaxDensity, type FishTank } from '../fish/api'
import { fetchGrowBedConfigs } from '../growbeds/api'
import { fmt, sum } from '../fish/fishShared'
import { ApiError } from '../../lib/apiClient'
import '../fish/fish.css'
import '../dashboard/dashboard.css'
import './settings.css'

export function GeneralSettings() {
  const { systemId: activeId, system: activeSystem } = useSettingsSystem()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seed the rename field from the active system, and re-seed when it changes.
  useEffect(() => {
    if (!activeSystem) return
    setName(activeSystem.system_name ?? '')
  }, [activeSystem])

  const mutation = useMutation({
    mutationFn: () => updateSystem(activeId as string, { system_name: name }),
    onSuccess: () => {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['systems'] })
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not save changes.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Enter a system name.')
    mutation.mutate()
  }

  if (!activeId) return <div className="empty">No systems in this farm yet. Add one from the “+” in the header.</div>

  const owner = isOwnedSystem(activeSystem)

  return (
    <>
      <div className="set-card">
        <h2 className="set-title">System name</h2>
        <p className="set-sub">
          {owner
            ? 'Rename this system. Tanks, beds and stock are configured under Fish and Plants → Beds.'
            : 'This system was shared with you. Only its owner can rename it.'}
        </p>

        <form className="mform" onSubmit={onSubmit}>
          {error && <div className="set-error">{error}</div>}
          {saved && <div className="set-ok">Saved ✓</div>}

          <div className="field">
            <label htmlFor="sys-name">System name</label>
            <input id="sys-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!owner} />
          </div>

          {owner && (
            <div className="mform-actions">
              <button className="btn" type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      <SystemInformation systemId={activeId} />
    </>
  )
}

// A live, read-only summary of the system's actual make-up: tanks, water
// volume, fish stock and stocking density, plus grow beds and capacity. This
// replaces the old "system type" field, which was never part of the setup.
function SystemInformation({ systemId }: { systemId: string }) {
  const tanksQ = useQuery({ queryKey: ['fish-inventory', systemId], queryFn: () => fetchFishInventory(systemId) })
  const bedsQ = useQuery({ queryKey: ['grow-bed-configs', systemId], queryFn: () => fetchGrowBedConfigs(systemId) })

  const tanks = tanksQ.data ?? []
  const beds = bedsQ.data ?? []
  const loading = tanksQ.isLoading || bedsQ.isLoading

  // Fish aggregates.
  const tankVolumeM3 = tanks.reduce((a, t) => a + tankM3(t), 0)
  const totalFish = sum(tanks, 'current_count')
  const totalBiomass = sum(tanks, 'biomass_kg')
  const avgDensity = tankVolumeM3 > 0 ? totalBiomass / tankVolumeM3 : null
  const species = uniqueLabels(tanks.map((t) => t.tank_fish_type))

  // Bed aggregates.
  const bedAreaM2 = beds.reduce((a, b) => a + (b.equivalent_m2 ?? b.area_m2 ?? 0), 0)
  const bedCapacity = beds.reduce((a, b) => a + (b.plant_capacity ?? 0), 0)
  const bedTypes = uniqueLabels(beds.map((b) => b.bed_type))

  return (
    <div className="set-card wide" style={{ marginTop: 18 }}>
      <h2 className="set-title">System information</h2>
      <p className="set-sub">A live summary of this system's tanks, beds and stock, drawn from your latest data.</p>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : (
        <>
          <div className="sysinfo-stats">
            <Stat label="Fish tanks" value={fmt(tanks.length)} />
            <Stat label="Water volume" value={fmt(tankVolumeM3, 1)} unit="m³" />
            <Stat label="Fish stock" value={fmt(totalFish)} unit="fish" />
            <Stat label="Biomass" value={fmt(totalBiomass, 1)} unit="kg" />
            <Stat label="Stocking density" value={fmt(avgDensity, 1)} unit="kg/m³" />
            <Stat label="Grow beds" value={fmt(beds.length)} />
            <Stat label="Grow area" value={fmt(bedAreaM2, 1)} unit="m²" />
            <Stat label="Plant capacity" value={fmt(bedCapacity)} unit="plants" />
          </div>

          <div className="sysinfo-meta">
            {species.length > 0 && (
              <div><span className="sysinfo-meta-k">Species</span> {species.join(', ')}</div>
            )}
            {bedTypes.length > 0 && (
              <div><span className="sysinfo-meta-k">Bed types</span> {bedTypes.join(', ')}</div>
            )}
          </div>

          {tanks.length > 0 && (
            <>
              <h3 className="sysinfo-h3">Fish tanks</h3>
              <div className="sysinfo-table-wrap">
                <table className="sysinfo-table">
                  <thead>
                    <tr>
                      <th>Tank</th><th>Size</th><th>Species</th>
                      <th className="num">Fish</th><th className="num">Biomass</th>
                      <th className="num">Density</th><th className="num">of max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...tanks].sort((a, b) => a.tank_number - b.tank_number).map((t) => {
                      const m3 = tankM3(t)
                      const dens = t.density_kg_m3 ?? (m3 > 0 && t.biomass_kg != null ? t.biomass_kg / m3 : null)
                      const max = tankMaxDensity(t)
                      const pct = dens != null && max > 0 ? dens / max : null
                      return (
                        <tr key={t.fish_tank_id}>
                          <td>Tank {t.tank_number}</td>
                          <td>{fmt(m3, m3 < 10 ? 1 : 0)} m³</td>
                          <td>{label(t.tank_fish_type)}</td>
                          <td className="num">{fmt(t.current_count)}</td>
                          <td className="num">{fmt(t.biomass_kg, 1)} kg</td>
                          <td className="num">{fmt(dens, 1)}</td>
                          <td className={`num ${pctClass(pct)}`}>{pct != null ? `${Math.round(pct * 100)}%` : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {beds.length > 0 && (
            <>
              <h3 className="sysinfo-h3">Grow beds</h3>
              <div className="sysinfo-table-wrap">
                <table className="sysinfo-table">
                  <thead>
                    <tr>
                      <th>Bed</th><th>Type</th>
                      <th className="num">Area</th><th className="num">Capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...beds].sort((a, b) => (a.bed_number ?? 0) - (b.bed_number ?? 0)).map((b) => (
                      <tr key={b.id}>
                        <td>{b.bed_name || `Bed ${b.bed_number ?? ''}`.trim()}</td>
                        <td>{label(b.bed_type)}</td>
                        <td className="num">{fmt(b.equivalent_m2 ?? b.area_m2, 1)} m²</td>
                        <td className="num">{b.plant_capacity != null ? `${fmt(b.plant_capacity)} plants` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tanks.length === 0 && beds.length === 0 && (
            <div className="empty">No tanks or beds configured yet. Add them under Fish and Plants → Beds.</div>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="sysinfo-stat">
      <div className="sysinfo-stat-val">{value}{unit && <span className="sysinfo-stat-unit"> {unit}</span>}</div>
      <div className="sysinfo-stat-label">{label}</div>
    </div>
  )
}

// A tank's volume in m³ — prefer the explicit size, fall back to litres.
function tankM3(t: FishTank): number {
  if (t.size_m3 != null && t.size_m3 > 0) return t.size_m3
  if (t.volume_liters != null && t.volume_liters > 0) return t.volume_liters / 1000
  return 0
}

function pctClass(pct: number | null): string {
  if (pct == null) return ''
  if (pct >= 0.9) return 'bad'
  if (pct >= 0.75) return 'warn'
  return 'ok'
}

// Title-case a raw enum-ish value ("media-bed" → "Media bed"); keep known
// acronyms upper-case ("dwc" → "DWC"); em-dash if empty.
const ACRONYMS = new Set(['dwc', 'nft', 'ibc'])
function label(v: string | null | undefined): string {
  if (!v) return '—'
  const s = v.replace(/[-_]+/g, ' ').trim()
  if (!s) return '—'
  if (ACRONYMS.has(s.toLowerCase())) return s.toUpperCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function uniqueLabels(vals: (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of vals) {
    if (!v) continue
    const l = label(v)
    if (l !== '—' && !seen.has(l)) { seen.add(l); out.push(l) }
  }
  return out
}
