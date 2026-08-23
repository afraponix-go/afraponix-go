import { useState, type KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import {
  fetchLatestNutrients,
  fetchSystemTargets,
  setReferenceCrop,
  bandStatus,
  NUTRIENT_BAND_KEY,
  type Band,
  type LatestNutrients,
  type NutrientReading,
} from './api'
import { fetchFishInventory, fetchDensityHistory, tankMaxDensity } from '../fish/api'
import { sum, fmt, Stat } from '../fish/fishShared'
import { CHARTABLE, fetchSeries, type SeriesPoint } from '../charts/api'
import { parseTrackedMetrics, ALL_METRIC_KEYS } from '../water/api'
import { MetricChartModal } from '../charts/MetricChartModal'
import './dashboard.css'
import '../fish/fish.css'

type ChartCfg = { title: string; unit: string; min?: number; max?: number; queryKey: QueryKey; makeSeries: (days: number | null) => Promise<SeriesPoint[]> }

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
  { key: 'kh', label: 'KH', unit: 'dKH', digits: 1, status: (v) => (v >= 4 && v <= 8 ? 'good' : 'warn') },
  { key: 'dissolved_oxygen', label: 'Dissolved O₂', unit: 'mg/L', digits: 1, status: (v) => (v >= 5 ? 'good' : 'warn') },
  { key: 'ammonia', label: 'Ammonia', unit: 'ppm', digits: 2, status: (v) => (v < 1 ? 'good' : 'warn') },
  { key: 'nitrite', label: 'Nitrite', unit: 'ppm', digits: 2, status: (v) => (v < 1 ? 'good' : 'warn') },
  { key: 'ec', label: 'EC', unit: 'µS/cm', digits: 0 },
  { key: 'humidity', label: 'Humidity', unit: '%', digits: 0 },
  { key: 'salinity', label: 'Salinity', unit: 'ppt', digits: 2 },
]

const NUTRIENTS: { key: string; label: string }[] = [
  { key: 'nitrate', label: 'Nitrate (N)' },
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

function clickProps(onOpen?: () => void) {
  return onOpen
    ? {
        className: 'metric clickable',
        onClick: onOpen,
        role: 'button' as const,
        tabIndex: 0,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        },
      }
    : { className: 'metric' }
}

function WaterCard({ def, reading, onOpen }: { def: MetricDef; reading?: NutrientReading; onOpen?: () => void }) {
  const v = reading?.value
  const has = v != null && Number.isFinite(v)
  const status: Status = has && def.status ? def.status(v as number) : 'none'
  return (
    <div {...clickProps(onOpen)}>
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

function NutrientTile({ label, reading, band, onOpen }: { label: string; reading: NutrientReading; band?: Band | null; onOpen?: () => void }) {
  const badge = sourceBadge(reading.source)
  const status = bandStatus(reading.value, band)
  const statusText = status === 'low' ? 'Low' : status === 'high' ? 'High' : status === 'good' ? 'In range' : null
  return (
    <div {...clickProps(onOpen)}>
      <div className="label">{label}</div>
      <div className="value">
        {reading.value.toFixed(reading.value >= 100 ? 0 : 2)}
        {reading.unit && <span className="unit">{reading.unit}</span>}
      </div>
      {statusText && band?.target != null ? (
        <span className={`status band-${status}`} title={`Target ${band.target}${band.floor != null ? ` · floor ${band.floor}` : ''}`}>{statusText}</span>
      ) : (
        <span className="source" title={`${badge.label} reading`}>{badge.icon} {badge.label}</span>
      )}
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
  const [chart, setChart] = useState<ChartCfg | null>(null)

  const { data: nutrients = {}, isLoading, isError } = useQuery({
    queryKey: ['nutrients', 'latest', activeId],
    queryFn: () => fetchLatestNutrients(activeId as string),
    enabled: !!activeId,
  })

  const { data: tanks = [] } = useQuery({
    queryKey: ['fish-inventory', activeId],
    queryFn: () => fetchFishInventory(activeId as string),
    enabled: !!activeId,
  })

  const qc = useQueryClient()
  const { data: sysTargets } = useQuery({
    queryKey: ['system-targets', activeId],
    queryFn: () => fetchSystemTargets(activeId as string),
    enabled: !!activeId,
  })
  const setRef = useMutation({
    mutationFn: ({ crop, stage }: { crop: string | null; stage?: 'vegetative' | 'fruiting' }) => setReferenceCrop(activeId as string, crop, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-targets', activeId] }),
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

  // Only show the metrics this system tracks. A key that isn't a trackable
  // metric at all (e.g. the derived "nitrogen" nutrient) is always shown.
  const tracked = parseTrackedMetrics(activeSystem?.tracked_metrics)
  const isTracked = (key: string) => tracked.has(key) || !ALL_METRIC_KEYS.includes(key)

  const waterShown = WATER.filter((def) => isTracked(def.key))
  let presentNutrients = NUTRIENTS.filter(
    (n) => isTracked(n.key) && nutrients[n.key] && Number.isFinite(nutrients[n.key].value),
  )
  // Nitrate and nitrogen are the same N reading — show only nitrate when present.
  if (presentNutrients.some((n) => n.key === 'nitrate')) presentNutrients = presentNutrients.filter((n) => n.key !== 'nitrogen')

  const totalFish = sum(tanks, 'current_count')
  const totalBiomass = sum(tanks, 'biomass_kg')
  const totalVolumeM3 = sum(tanks, 'size_m3')
  const systemDensity = totalVolumeM3 > 0 ? totalBiomass / totalVolumeM3 : 0
  const systemMax = tanks.length ? Math.max(25, ...tanks.map((t) => tankMaxDensity(t))) : 25

  // Open a chart modal for a nutrient/water parameter (its history lives in
  // nutrient_readings). Healthy-range band comes from the shared CHARTABLE def.
  const openParam = (key: string, fallbackLabel: string, fallbackUnit = '') => {
    const c = CHARTABLE.find((x) => x.key === key)
    setChart({
      title: c?.label ?? fallbackLabel,
      unit: c?.unit ?? fallbackUnit,
      min: c?.min,
      max: c?.max,
      queryKey: ['series', activeId, key],
      makeSeries: (days) => fetchSeries(activeId as string, key, { days }),
    })
  }

  // Open a chart modal for a fish metric derived from the density history.
  const openFish = (metric: 'density' | 'biomass') => {
    setChart({
      title: metric === 'density' ? 'Fish Density' : 'Total Biomass',
      unit: metric === 'density' ? 'kg/m³' : 'kg',
      max: metric === 'density' ? systemMax : undefined,
      queryKey: ['fish-series', activeId, metric],
      makeSeries: async (days) => {
        const pts = await fetchDensityHistory(activeId as string, days ?? 3660)
        return pts.map((p) => {
          const d = new Date(p.date)
          return { date: p.date, label: `${d.getMonth() + 1}/${d.getDate()}`, value: metric === 'density' ? p.density : p.biomass_kg ?? 0 }
        })
      },
    })
  }

  // Reference-crop selector for the nutrient target bands.
  const refValue = sysTargets?.mode === 'primary' && sysTargets.primary
    ? `${sysTargets.primary.crop}|${sysTargets.primary.stage}`
    : 'auto'
  const refOptions: { value: string; label: string }[] = [{ value: 'auto', label: 'Auto — most demanding' }]
  for (const o of sysTargets?.options ?? []) {
    if (o.hasFruiting) {
      refOptions.push({ value: `${o.code}|vegetative`, label: `${o.name} · Vegetative` })
      refOptions.push({ value: `${o.code}|fruiting`, label: `${o.name} · Fruiting` })
    } else {
      refOptions.push({ value: `${o.code}|vegetative`, label: o.name })
    }
  }
  if (sysTargets?.primary && !refOptions.some((r) => r.value === refValue)) {
    refOptions.push({ value: refValue, label: `${sysTargets.primary.crop} · ${sysTargets.primary.stage}` })
  }
  const onRefChange = (v: string) => {
    if (v === 'auto') setRef.mutate({ crop: null })
    else { const [c, s] = v.split('|'); setRef.mutate({ crop: c, stage: s as 'vegetative' | 'fruiting' }) }
  }

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

      {tanks.length > 0 && (
        <>
          <h2 className="section-title">Fish</h2>
          <div className="metric-grid">
            <Stat label="Total Fish" value={fmt(totalFish)} sub={`Across ${tanks.length} tank${tanks.length === 1 ? '' : 's'}`} />
            <Stat label="Total Biomass" value={fmt(totalBiomass, 1)} unit="kg" sub={`≈ ${fmt(totalVolumeM3, 1)} m³ water`} onClick={() => openFish('biomass')} />
            <Stat label="Current Density" value={fmt(systemDensity, 1)} unit="kg/m³" sub={`Max ${systemMax} kg/m³`} onClick={() => openFish('density')}>
              <div className="density-bar"><div className="density-fill" style={{ width: `${Math.min(100, (systemDensity / systemMax) * 100)}%` }} /></div>
            </Stat>
          </div>
        </>
      )}

      {waterShown.length > 0 && (
        <>
          <h2 className="section-title">Water quality</h2>
          <div className="metric-grid">
            {waterShown.map((def) => (
              <WaterCard key={def.key} def={def} reading={nutrients[def.key]} onOpen={() => openParam(def.key, def.label, def.unit)} />
            ))}
          </div>
        </>
      )}

      {presentNutrients.length > 0 && (
        <>
          <div className="dash-section-head">
            <h2 className="section-title" style={{ margin: 0 }}>Nutrient levels</h2>
            {(sysTargets?.options.length ?? 0) > 0 && (
              <label className="ref-crop">
                <span>Targets for</span>
                <select value={refValue} onChange={(e) => onRefChange(e.target.value)}>
                  {refOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            )}
          </div>
          <div className="metric-grid">
            {presentNutrients.map((n) => (
              <NutrientTile key={n.key} label={n.label} reading={nutrients[n.key]} band={sysTargets?.bands[NUTRIENT_BAND_KEY[n.key]]} onOpen={() => openParam(n.key, n.label)} />
            ))}
          </div>
        </>
      )}

      {chart && (
        <MetricChartModal
          title={chart.title}
          unit={chart.unit}
          min={chart.min}
          max={chart.max}
          queryKey={chart.queryKey}
          makeSeries={chart.makeSeries}
          onClose={() => setChart(null)}
        />
      )}
    </div>
  )
}
