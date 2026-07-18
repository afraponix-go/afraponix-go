import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory, maxDensityForSpecies } from './api'
import { fmt } from './fishShared'
import '../dashboard/dashboard.css'
import '../water/water.css'
import './fish.css'

export function TankInformation() {
  const { activeId } = useSystems()
  const { data: tanks = [], isLoading, isError } = useQuery({
    queryKey: ['fish-inventory', activeId],
    queryFn: () => fetchFishInventory(activeId as string),
    enabled: !!activeId,
  })

  if (!activeId) return <div className="empty">Select a system to see tank details.</div>
  if (isLoading) return <div className="empty">Loading tanks…</div>
  if (isError) return <div className="empty">Could not load tank data.</div>
  if (tanks.length === 0) return <div className="empty">No fish tanks configured yet.</div>

  return (
    <div>
      <h2 className="section-title" style={{ marginTop: 0 }}>Tank configuration</h2>
      <div className="wq-table-wrap">
        <table className="wq-table op-table">
          <thead>
            <tr>
              <th>Tank</th>
              <th>Species</th>
              <th>Volume (L)</th>
              <th>Size (m³)</th>
              <th>Count</th>
              <th>Avg wt (g)</th>
              <th>Biomass (kg)</th>
              <th>Density (kg/m³)</th>
              <th>Max (kg/m³)</th>
            </tr>
          </thead>
          <tbody>
            {tanks
              .slice()
              .sort((a, b) => a.tank_number - b.tank_number)
              .map((t) => (
                <tr key={t.fish_tank_id}>
                  <td className="op-text">Tank {t.tank_number}</td>
                  <td className="op-text" style={{ textTransform: 'capitalize' }}>{t.tank_fish_type ?? '—'}</td>
                  <td>{fmt(t.volume_liters)}</td>
                  <td>{fmt(t.size_m3, 1)}</td>
                  <td>{fmt(t.current_count)}</td>
                  <td>{fmt(t.average_weight)}</td>
                  <td>{fmt(t.biomass_kg, 1)}</td>
                  <td>{fmt(t.density_kg_m3, 2)}</td>
                  <td>{maxDensityForSpecies(t.tank_fish_type)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
