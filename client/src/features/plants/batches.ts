import { z } from 'zod'
import { api } from '../../lib/apiClient'

const num = z.coerce.number()
const numish = z.union([z.string(), z.number()]).nullable().optional().transform((v) => (v == null || v === '' ? null : Number(v)))

// A batch = all plant_growth rows sharing a batch_id, aggregated server-side by
// GET /plants/batches/:systemId (planted − harvested, age, derived status).
export type BatchStatus = 'growing' | 'approaching' | 'ready' | 'harvested'

export const batchSchema = z.object({
  batch_id: z.string(),
  crop_type: z.string(),
  grow_bed_id: numish,
  bed_name: z.string().nullable().optional(),
  bed_type: z.string().nullable().optional(),
  bed_number: numish,
  seed_variety: z.string().nullable().optional(),
  days_to_harvest: numish,
  plants_per_m2: numish,
  planted_date: z.string().nullable().optional(),
  last_event_date: z.string().nullable().optional(),
  planted: num,
  harvested: num,
  remaining: num,
  harvest_weight_g: num,
  age_days: numish,
  status: z.string().transform((s) => s as BatchStatus),
  photo_url: z.string().nullable().optional(),
})
export type Batch = z.infer<typeof batchSchema>

export async function fetchBatches(systemId: string): Promise<Batch[]> {
  const data = await api<unknown>(`/plants/batches/${systemId}`)
  const parsed = z.object({ batches: z.array(batchSchema) }).safeParse(data)
  return parsed.success ? parsed.data.batches : []
}

// A batch counts as overdue once it's this many days past its harvest date.
export const OVERDUE_DAYS = 7

// Days past the target harvest date (age − days-to-harvest); null if unknown.
export function overdueDays(b: Batch): number | null {
  if (b.age_days == null || b.days_to_harvest == null) return null
  return b.age_days - b.days_to_harvest
}

// Still standing (remaining > 0) and at least a week past its harvest date.
export function isOverdue(b: Batch): boolean {
  const over = overdueDays(b)
  return b.remaining > 0 && over != null && over >= OVERDUE_DAYS
}
