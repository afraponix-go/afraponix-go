import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchLatestNutrients, type LatestNutrients, type NutrientReading } from './api'
import './dashboard.css'

type Status = 'good' | 'warn' | 'none'
type MetricDef = {
  key: string
  label: string
  unit?: string
  digits?: number
  status?: (v: number) => Status
}

// Water-quality parameters (all now live in nutrient_readings). Aquaponics-typical
// healthy ranges give a good/warn pill for the ones that have one.
const WATER: MetricDef[] = [
  { key: 'temperature', label: 'Water Temp', unit: '°C', digits: 1, status: (v) => (v >= 18 && v <= 30 ? 'good' : 'warn') },
  { key: 'ph', label: 'pH', digits: 2, status: (v) => (v >= 6 && v <= 7.6 ? 'good' : 'warn') },
  { key: 'dissolved_oxygen', label: 'Dissolved O₂', unit: 'mg/L', digits: 1, status: (v) => (v >= 5 ? 'good' : 'warn') },
  { key: 'ammonia', label: 'Ammonia', unit: 'ppm', digits: 2, status: (v) => (v < 1 ? 'good' : 'warn') },
  { key: 'nitrite', label: 'Nitrite', unit: 'ppm', digits: 2, status: (v) => (v < 1 ? 'good' : 'warn') },
  { key: 'nitrate', label: 'Nitrate', unit: 'ppm', digits: 1 },
  { key: 'ec', label: 'EC', unit: 'µS/cm', digits: 0 },
  { key: 'humidity', label: 'Humidity', unit: '%', digits: 0 },
  { key: 'salinity', label: 'Salinity', unit: 'ppt', digits: 2 },
]

const NUTRIENTS: { key: string; label: string }[] = [
  { key: 'nitrogen', label: 'Nitrogen (N)' },
  { key: 'phosphorus', label: 'Phosphorus (P)' },
  { key: 'potassium', label: 'Potassium (K)' },
  { key: 'calcium', label: 'Calcium (Ca)' },
  { key: 'magnesium', label: 'Magnesium (Mg)' },
  { key: 'iron', label: 'Iron (Fe)' },
]

function sourceBadge(source?: string | null) {
  const s = (source ?? '').toLowerCase()
  if (s.includes('sensor')) return { icon: '📡', label: 'Sensor' }
  if (s.includes('calc')) return { icon: '🧪', label: 'Calculated' }
  return { icon: '📝', label: 'Manual' }
}

function WaterCard({ def, reading }: { def: MetricDef; reading?: NutrientReading }) {
  const v = reading?.value
  const has = v != null && Number.isFinite(v)
  const status: Status = has && def.status ? def.status(v as number) : 'none'
  return (
    <div className="metric">
      <div className="label">{def.label}</div>
      {has ? (
        <div className="value">
          {(v as number).toFixed(def.digits ?? 1)}
          {def.unit && <span className="unit">{def.unit}</span>}
        </div>
      ) : (
        <div className="value na">N/A</div>
      )}
      {def.status && <span className={`status ${status}`}>{status === 'good' ? 'In range' : status === 'warn' ? 'Check' : 'No data'}</span>}
    </div>
  )
}

function NutrientTile({ label, reading }: { label: string; reading: NutrientReading }) {
  const badge = sourceBadge(reading.source)
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">
        {reading.value.toFixed(reading.value >= 100 ? 0 : 2)}
        {reading.unit && <span className="unit">{reading.unit}</span>}
      </div>
      <span className="source" title={`${badge.label} reading`}>
        {badge.icon} {badge.label}
      </span>
    </div>
  )
}

function latestDate(nutrients: LatestNutrients): string | null {
  const dates = Object.values(nutrients)
    .map((r) => r.reading_date)
    .filter((d): d is string => !!d)
    .sort()
  return dates.length ? dates[dates.length - 1] : null
}

export function DashboardPage() {
  const { activeSystem, activeId, isLoading: systemsLoading } = useSystems()

  const { data: nutrients = {}, isLoading, isError } = useQuery({
    queryKey: ['nutrients', 'latest', activeId],
    queryFn: () => fetchLatestNutrients(activeId as string),
    enabled: !!activeId,
  })

  if (systemsLoading) return <div className="empty">Loading systems…</div>
  if (!activeId) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Dashboard</h1>
        <div className="empty">
          <p>No systems yet. Create your first aquaponics system to see live metrics here.</p>
        </div>
      </div>
    )
  }

  const updated = latestDate(nutrients)
  const presentNutrients = NUTRIENTS.filter((n) => nutrients[n.key] && Number.isFinite(nutrients[n.key].value))

  return (
    <div>
      <div className="dash-head">
        <h1>{activeSystem?.system_name ?? 'Dashboard'}</h1>
        <span className="dash-sub">
          {isLoading
            ? 'Loading latest readings…'
            : isError
              ? 'Could not load readings'
              : updated
                ? `Latest reading: ${new Date(updated).toLocaleDateString()}`
                : 'No readings yet'}
        </span>
      </div>

      <h2 className="section-title">Water quality</h2>
      <div className="metric-grid">
        {WATER.map((def) => (
          <WaterCard key={def.key} def={def} reading={nutrients[def.key]} />
        ))}
      </div>

      {presentNutrients.length > 0 && (
        <>
          <h2 className="section-title">Nutrient levels</h2>
          <div className="metric-grid">
            {presentNutrients.map((n) => (
              <NutrientTile key={n.key} label={n.label} reading={nutrients[n.key]} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
