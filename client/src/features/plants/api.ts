import { z } from 'zod'
import { api } from '../../lib/apiClient'

const numish = z.union([z.string(), z.number()]).nullable().optional().transform((v) => (v == null || v === '' ? null : Number(v)))

export const allocationSchema = z.object({
  id: z.number(),
  grow_bed_id: z.number(),
  crop_type: z.string(),
  percentage_allocated: numish,
  plants_planted: numish,
  plant_spacing: numish,
  date_planted: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  bed_name: z.string().nullable().optional(),
  bed_type: z.string().nullable().optional(),
  equivalent_m2: numish,
})
export type Allocation = z.infer<typeof allocationSchema>

export async function fetchAllocations(systemId: string): Promise<Allocation[]> {
  const data = await api<unknown[]>(`/plants/allocations/${systemId}`)
  const parsed = z.array(allocationSchema).safeParse(data)
  return parsed.success ? parsed.data : []
}

// "cherry_tomatoes" -> "Cherry Tomatoes"
export function prettyCrop(crop: string): string {
  return crop
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Allocation CRUD (routes/plants.js). POST upserts by (system, bed, crop).
export function saveAllocation(input: {
  systemId: string
  growBedId: number
  cropType: string
  percentageAllocated: number
  plantsPlanted?: number
  datePlanted?: string
  plantSpacing?: number
}) {
  return api('/plants/allocations', { method: 'POST', body: input })
}

export function updateAllocation(id: number, input: { cropType: string; percentageAllocated: number; plantsPlanted?: number }) {
  return api(`/plants/allocations/${id}`, { method: 'PUT', body: input })
}

export function deleteAllocation(id: number) {
  return api(`/plants/allocations/${id}`, { method: 'DELETE' })
}

// Canonical estimate of how many plants a % allocation of a bed holds.
// Vertical beds scale by vertical count; area beds use a square spacing grid.
export function plantsForAllocation(
  bed: { bed_type?: string | null; equivalent_m2?: number | null; vertical_count?: number | null; plants_per_vertical?: number | null },
  percentage: number,
  spacingCm: number,
): number {
  const pct = Math.max(0, percentage) / 100
  if ((bed.bed_type ?? '').toLowerCase() === 'vertical' && bed.vertical_count && bed.plants_per_vertical) {
    return Math.floor(pct * bed.vertical_count * bed.plants_per_vertical)
  }
  const areaM2 = pct * (bed.equivalent_m2 ?? 0)
  const spacing = spacingCm > 0 ? spacingCm : 30
  return Math.floor((areaM2 * 10000) / (spacing * spacing))
}
