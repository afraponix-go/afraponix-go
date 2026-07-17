import { z } from 'zod'
import { api } from '../../lib/apiClient'

// System IDs are strings (e.g. "system_1784296376035"). Numeric-looking fields
// come back as strings from mysql2, so coerce where we need numbers.
export const systemSchema = z.object({
  id: z.string(),
  system_name: z.string(),
  system_type: z.string().nullable().optional(),
  fish_tank_count: z.coerce.number().nullable().optional(),
  grow_bed_count: z.coerce.number().nullable().optional(),
  total_grow_area: z.coerce.number().nullable().optional(),
})
export type System = z.infer<typeof systemSchema>

export async function fetchSystems(): Promise<System[]> {
  const data = await api<unknown[]>('/systems')
  return z.array(systemSchema).parse(data)
}
