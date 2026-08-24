import { z } from 'zod'
import { api } from '../../lib/apiClient'

const numish = z.union([z.string(), z.number()]).nullable().optional().transform((v) => (v == null || v === '' ? null : Number(v)))

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
    plants_per_m2?: number
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
      plants_per_m2: input.plants_per_m2 ?? null,
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

// Move an entire batch to a different grow bed in the SAME system (bulk-updates
// its rows in place).
export function moveBatch(systemId: string, batchId: string, newGrowBedId: number) {
  return api(`/data/batch/${systemId}/${encodeURIComponent(batchId)}/grow-bed`, {
    method: 'PUT',
    body: { newGrowBedId },
  })
}

// Transfer some/all of a batch to a bed in ANOTHER system (event-based: closes
// that many plants out of the source batch and opens a linked batch in the
// destination). Returns the new batch id.
export function transferBatch(input: {
  from_system_id: string
  batch_id: string
  to_system_id: string
  to_bed_id: number
  count?: number
}): Promise<{ new_batch_id: string; count: number }> {
  return api('/plants/transfer', { method: 'POST', body: input })
}

// Record a harvest against a batch: one plant_growth row with plants_harvested
// (0 = fruit-only, leaves the plants in the bed) and weight stored in grams.
export function recordHarvest(
  systemId: string,
  input: {
    date: string
    grow_bed_id: number
    crop_type: string
    batch_id: string
    plants_harvested: number
    harvest_weight_kg?: number
    quality?: string
    notes?: string
  },
) {
  return api(`/data/plant-growth/${systemId}`, {
    method: 'POST',
    body: {
      date: input.date,
      grow_bed_id: input.grow_bed_id,
      crop_type: input.crop_type,
      plants_harvested: input.plants_harvested,
      harvest_weight: input.harvest_weight_kg ? Math.round(input.harvest_weight_kg * 1000) : null,
      health: input.quality ?? null,
      growth_stage: 'harvest',
      notes: input.notes ?? null,
      batch_id: input.batch_id,
    },
  })
}

// A raw plant_growth row (the event log). Harvest rows have plants_harvested
// and/or harvest_weight; planting rows have new_seedlings.
export const plantRowSchema = z.object({
  id: z.number(),
  date: z.string().nullable().optional(),
  grow_bed_id: numish,
  crop_type: z.string().nullable().optional(),
  count: numish,
  harvest_weight: numish,
  plants_harvested: numish,
  new_seedlings: numish,
  health: z.string().nullable().optional(),
  growth_stage: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  batch_id: z.string().nullable().optional(),
  seed_variety: z.string().nullable().optional(),
  days_to_harvest: numish,
  pest_control: z.string().nullable().optional(),
})
export type PlantRow = z.infer<typeof plantRowSchema>

export async function fetchPlantGrowth(systemId: string): Promise<PlantRow[]> {
  const data = await api<unknown>(`/data/plant-growth/${systemId}`)
  const parsed = z.array(plantRowSchema).safeParse(data)
  return parsed.success ? parsed.data : []
}

export function isHarvestRow(r: PlantRow): boolean {
  return (r.plants_harvested ?? 0) > 0 || (r.harvest_weight ?? 0) > 0
}

// Update an existing row. The PUT endpoint overwrites the listed columns, so we
// send the row's current values with the edits applied to avoid clobbering.
export function updatePlantEntry(
  entryId: number,
  row: {
    date: string | null
    grow_bed_id: number | null
    crop_type: string | null
    count: number | null
    harvest_weight: number | null
    plants_harvested: number | null
    new_seedlings: number | null
    pest_control: string | null
    health: string | null
    growth_stage: string | null
    notes: string | null
  },
) {
  return api(`/data/plant-growth/${entryId}`, { method: 'PUT', body: row })
}

export function deletePlantEntry(systemId: string, recordId: number) {
  return api(`/data/plant-growth/${systemId}/${recordId}`, { method: 'DELETE' })
}
