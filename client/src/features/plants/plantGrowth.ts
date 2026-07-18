import { api } from '../../lib/apiClient'

// A batch id groups plant_growth rows. Matches the old app's format.
export function generateBatchId(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `BATCH_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

// Record a new planting: one plant_growth row with new_seedlings = count.
export function recordPlanting(
  systemId: string,
  input: {
    date: string
    grow_bed_id: number
    crop_type: string
    count: number
    growth_stage?: string
    seed_variety?: string
    days_to_harvest?: number
    notes?: string
  },
) {
  const batch_id = generateBatchId()
  return api(`/data/plant-growth/${systemId}`, {
    method: 'POST',
    body: {
      date: input.date,
      grow_bed_id: input.grow_bed_id,
      crop_type: input.crop_type,
      count: input.count,
      new_seedlings: input.count,
      health: 'good',
      growth_stage: input.growth_stage ?? 'seedling',
      seed_variety: input.seed_variety ?? null,
      days_to_harvest: input.days_to_harvest ?? null,
      notes: input.notes ?? null,
      batch_id,
      batch_created_date: input.date,
    },
  })
}

// Move an entire batch to a different grow bed (bulk-updates its rows).
export function moveBatch(systemId: string, batchId: string, newGrowBedId: number) {
  return api(`/data/batch/${systemId}/${encodeURIComponent(batchId)}/grow-bed`, {
    method: 'PUT',
    body: { newGrowBedId },
  })
}
