import { z } from 'zod'
import { api } from '../../lib/apiClient'

const numish = z.union([z.string(), z.number()]).nullable().optional().transform((v) => (v == null || v === '' ? null : Number(v)))

export const growBedSchema = z.object({
  id: z.number(),
  bed_name: z.string().nullable().optional(),
  bed_type: z.string().nullable().optional(),
  equivalent_m2: numish,
  total_allocated: numish,
  available_percentage: numish,
})
export type GrowBed = z.infer<typeof growBedSchema>

export async function fetchGrowBeds(systemId: string): Promise<GrowBed[]> {
  const data = await api<unknown[]>(`/plants/utilization/${systemId}`)
  const parsed = z.array(growBedSchema).safeParse(data)
  return parsed.success ? parsed.data : []
}
