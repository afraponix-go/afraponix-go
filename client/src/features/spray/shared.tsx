import type { FishSafety } from './api'

export const CATEGORY_LABEL: Record<string, string> = {
  insecticides: 'Insecticide',
  fungicides: 'Fungicide',
  'foliar-feeds': 'Foliar feed',
  'soil-drenches': 'Soil drench',
}

const FISH_TEXT: Record<FishSafety, string> = { safe: 'Fish-safe', caution: 'Caution', toxic: 'Fish-toxic' }

// Fish-safety pill. Toxic/caution carry the reason as a tooltip.
export function FishBadge({ safety, note }: { safety: FishSafety; note?: string | null }) {
  return (
    <span className={`fish-badge fish-${safety}`} title={note ?? FISH_TEXT[safety]}>
      {safety === 'toxic' ? '⚠ ' : safety === 'caution' ? '⚠ ' : '✓ '}
      {FISH_TEXT[safety]}
    </span>
  )
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
