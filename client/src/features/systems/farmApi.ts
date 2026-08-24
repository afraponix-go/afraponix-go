import { z } from 'zod'
import { api } from '../../lib/apiClient'

// A farm owns aquaponics systems. The user owns their farms; systems belong to
// one. (Sharing is still per-system — a shared system lives in its owner's farm.)
export const farmSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string().nullable().optional(),
  created_at: z.string().optional(),
  system_count: z.coerce.number().optional(),
})
export type Farm = z.infer<typeof farmSchema>

export async function fetchFarms(): Promise<Farm[]> {
  const data = await api<{ farms: unknown[] }>('/farms')
  return z.array(farmSchema).parse(data.farms ?? [])
}

export async function createFarm(input: { name: string; location?: string | null }): Promise<Farm> {
  const data = await api<{ farm: unknown }>('/farms', { method: 'POST', body: { name: input.name.trim(), location: input.location ?? null } })
  return farmSchema.parse((data as { farm: unknown }).farm)
}

export async function updateFarm(id: string, input: { name?: string; location?: string | null }) {
  return api(`/farms/${id}`, { method: 'PUT', body: input })
}

export async function deleteFarm(id: string) {
  return api(`/farms/${id}`, { method: 'DELETE' })
}
