import { CHART_RANGES, type ChartRangeKey } from './api'
import '../fish/fish.css'

// Segmented control for choosing a chart's time window. Reuses the .seg styles.
export function RangeSelector({ value, onChange }: { value: ChartRangeKey; onChange: (key: ChartRangeKey) => void }) {
  return (
    <div className="seg" role="tablist" aria-label="Time range">
      {CHART_RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          role="tab"
          aria-selected={value === r.key}
          className={`seg-btn${value === r.key ? ' active' : ''}`}
          onClick={() => onChange(r.key)}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
