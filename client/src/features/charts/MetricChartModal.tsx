import { useQuery, type QueryKey } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { MetricChart } from './MetricChart'
import type { SeriesPoint } from './api'

type Props = {
  title: string
  unit: string
  min?: number
  max?: number
  queryKey: QueryKey
  queryFn: () => Promise<SeriesPoint[]>
  onClose: () => void
}

// A metric's history rendered as a chart inside a modal, opened by clicking a
// metric card on the dashboard.
export function MetricChartModal({ title, unit, min, max, queryKey, queryFn, onClose }: Props) {
  const { data: series = [], isLoading, isError } = useQuery({ queryKey, queryFn })
  return (
    <Modal title={title} onClose={onClose} wide>
      <MetricChart series={series} label={title} unit={unit} min={min} max={max} isLoading={isLoading} isError={isError} />
    </Modal>
  )
}
