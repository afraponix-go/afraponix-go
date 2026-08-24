import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useSystems } from '../systems/SystemContext'
import { fetchFarmSummary } from '../systems/farmApi'
import { Stat, fmt } from '../fish/fishShared'
import './dashboard.css'

export function FarmDashboardPage() {
  const { activeFarm, activeFarmId, setActiveId } = useSystems()
  const navigate = useNavigate()
  const own = activeFarm?.kind === 'own'
  const { data, isLoading, isError } = useQuery({
    queryKey: ['farm-summary', activeFarmId],
    queryFn: () => fetchFarmSummary(activeFarmId as string),
    enabled: own && !!activeFarmId,
  })

  if (!own) {
    return <div className="empty">The farm overview is for your own farms. Pick one of your farms from the switcher in the header.</div>
  }

  const t = data?.totals

  const openSystem = (id: string) => { setActiveId(id); navigate('/') }

  return (
    <div>
      <div className="dash-head">
        <h1>{data?.farm.name ?? activeFarm?.name ?? 'Farm'}</h1>
        <span className="dash-sub">
          {isLoading ? 'Loading farm rollup…' : isError ? 'Could not load the farm rollup' : `${data?.system_count ?? 0} system${(data?.system_count ?? 0) === 1 ? '' : 's'}${t && t.needs_attention > 0 ? ` · ${t.needs_attention} need attention` : ''}`}
        </span>
      </div>

      {data && data.system_count === 0 ? (
        <div className="empty">No systems in this farm yet. Add one from the “+” in the header.</div>
      ) : (
        <>
          <div className="metric-grid">
            <Stat label="Total Fish" value={fmt(t?.fish_count ?? 0)} sub={`Across ${data?.system_count ?? 0} system${(data?.system_count ?? 0) === 1 ? '' : 's'}`} />
            <Stat label="Total Biomass" value={fmt(t?.biomass_kg ?? 0, 1)} unit="kg" sub="Live fish across the farm" />
            <Stat label="Plants Growing" value={fmt(t?.plants_growing ?? 0)} sub="Remaining in all beds" />
            <Stat label="Ready to Harvest" value={fmt(t?.plants_ready ?? 0)} sub="Reached days-to-harvest" />
          </div>

          <h2 className="section-title" style={{ marginTop: 24 }}>Systems</h2>
          <div className="farm-tablewrap">
            <table className="farm-table">
              <thead>
                <tr><th>System</th><th className="r">Fish</th><th className="r">Biomass</th><th className="r">Growing</th><th className="r">Ready</th><th className="r">pH</th></tr>
              </thead>
              <tbody>
                {(data?.systems ?? []).map((s) => (
                  <tr key={s.id} className="farm-row" onClick={() => openSystem(s.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') openSystem(s.id) }}>
                    <td>
                      <b>{s.system_name}</b>
                      {s.needs_attention && <span className="farm-attn" title="pH out of range">Needs attention</span>}
                    </td>
                    <td className="r">{fmt(s.fish_count)}</td>
                    <td className="r">{fmt(s.biomass_kg, 1)} kg</td>
                    <td className="r">{fmt(s.plants_growing)}</td>
                    <td className="r">{s.plants_ready > 0 ? <b className="farm-ready">{fmt(s.plants_ready)}</b> : '—'}</td>
                    <td className="r">
                      {s.ph == null ? <span className="ph-none">—</span> : (
                        <span className={`ph-pill ${s.ph_ok ? 'ok' : 'warn'}`}>{s.ph.toFixed(1)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
