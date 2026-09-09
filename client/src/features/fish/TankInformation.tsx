import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory, tankMaxDensity, type FishTank } from './api'
import { fmt } from './fishShared'
import { tankScanUrl } from './tankQr'
import { LabelPrintModal } from '../plants/LabelPrintModal'
import '../dashboard/dashboard.css'
import '../water/water.css'
import './fish.css'

export function TankInformation() {
  const { activeId } = useSystems()
  const [labelFor, setLabelFor] = useState<FishTank | null>(null)
  const { data: tanks = [], isLoading, isError } = useQuery({
    queryKey: ['fish-inventory', activeId],
    queryFn: () => fetchFishInventory(activeId as string),
    enabled: !!activeId,
  })

  if (!activeId) return <div className="empty">Select a system to see tank details.</div>
  if (isLoading) return <div className="empty">Loading tanks…</div>
  if (isError) return <div className="empty">Could not load tank data.</div>

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Tank configuration</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/scan" className="ghost">Scan</Link>
          <Link to="/fish/labels" className="ghost">Print labels</Link>
        </div>
      </div>

      {tanks.length === 0 ? (
        <div className="empty">No fish tanks configured yet.</div>
      ) : (
        <div className="wq-table-wrap">
          <table className="wq-table op-table resp-cards">
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tanks
                .slice()
                .sort((a, b) => a.tank_number - b.tank_number)
                .map((t) => (
                  <tr key={t.fish_tank_id}>
                    <td className="op-text" data-label="Tank">Tank {t.tank_number}</td>
                    <td className="op-text" data-label="Species" style={{ textTransform: 'capitalize' }}>{t.tank_fish_type ?? '—'}</td>
                    <td data-label="Volume (L)">{fmt(t.volume_liters)}</td>
                    <td data-label="Size (m³)">{fmt(t.size_m3, 1)}</td>
                    <td data-label="Count">{fmt(t.current_count)}</td>
                    <td data-label="Avg wt (g)">{fmt(t.average_weight)}</td>
                    <td data-label="Biomass (kg)">{fmt(t.biomass_kg, 1)}</td>
                    <td data-label="Density (kg/m³)">{fmt(t.density_kg_m3, 2)}</td>
                    <td data-label="Max (kg/m³)">{tankMaxDensity(t)}</td>
                    <td className="row-actions">
                      <button className="link-btn" onClick={() => setLabelFor(t)}>Label</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {labelFor && activeId && (
        <LabelPrintModal
          url={tankScanUrl(activeId, labelFor.fish_tank_id)}
          title={`Tank ${labelFor.tank_number}`}
          line1={labelFor.tank_fish_type ?? undefined}
          line2={`${fmt(labelFor.current_count)} fish`}
          onClose={() => setLabelFor(null)}
        />
      )}
    </div>
  )
}
