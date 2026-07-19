import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { CHARTABLE, fetchSeries, type Chartable } from './api'
import { MetricChart } from './MetricChart'
import '../dashboard/dashboard.css'
import './charts.css'

export function ChartsPage() {
  const { activeId, activeSystem } = useSystems()
  const [param, setParam] = useState<string>('temperature')
  const def = CHARTABLE.find((c) => c.key === param) as Chartable

  const { data: series = [], isLoading, isError } = useQuery({
    queryKey: ['series', activeId, param],
    queryFn: () => fetchSeries(activeId as string, param),
    enabled: !!activeId,
  })

  if (!activeId) return <div className="empty">Select a system to see charts.</div>

  return (
    <div>
      <div className="dash-head">
        <h1>Charts</h1>
        <span className="dash-sub">{activeSystem?.system_name}</span>
      </div>

      <div className="chart-controls">
        <label htmlFor="param">Parameter</label>
        <select id="param" className="sys-select" value={param} onChange={(e) => setParam(e.target.value)}>
          {CHARTABLE.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <MetricChart series={series} label={def.label} unit={def.unit} min={def.min} max={def.max} isLoading={isLoading} isError={isError} />
    </div>
  )
}
