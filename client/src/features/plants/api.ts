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
