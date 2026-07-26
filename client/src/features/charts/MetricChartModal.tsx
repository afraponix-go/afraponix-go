import { useState } from 'react'
import { useQuery, type QueryKey } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { MetricChart } from './MetricChart'
import { RangeSelector } from './RangeSelector'
import { rangeDays, type ChartRangeKey, type SeriesPoint } from './api'

type Props = {
  title: string
  unit: string
  min?: number
  max?: number
  // Base key for caching; the selected range is appended so each window caches
  // separately.
  queryKey: QueryKey
  // Fetch the series for a time window (days=null means all time).
  makeSeries: (days: number | null) => Promise<SeriesPoint[]>
  onClose: () => void
}

// A metric's history rendered as a chart inside a modal, opened by clicking a
// metric card on the dashboard. Carries its own time-range selector.
export function MetricChartModal({ title, unit, min, max, queryKey, makeSeries, onClose }: Props) {
  const [range, setRange] = useState<ChartRangeKey>('90d')
  const days = rangeDays(range)
  const { data: series = [], isLoading, isError } = useQuery({
    queryKey: [...queryKey, range],
    queryFn: () => makeSeries(days),
  })
  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="chart-range-bar">
        <RangeSelector value={range} onChange={setRange} />
      </div>
      <MetricChart series={series} label={title} unit={unit} min={min} max={max} isLoading={isLoading} isError={isError} />
    </Modal>
  )
}
