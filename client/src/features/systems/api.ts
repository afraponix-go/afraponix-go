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

// Create a system. The backend expects a client-generated string id and fills
// sensible defaults for anything omitted. Returns the new system's id.
export async function createSystem(input: {
  id: string
  system_name: string
  system_type?: string
  fish_type?: string
  fish_tank_count?: number
  grow_bed_count?: number
  total_grow_area?: number
}): Promise<string> {
  await api('/systems', {
    method: 'POST',
    body: { ...input, system_name: input.system_name.trim() },
  })
  return input.id
}

// Add a fish tank to a system (used by the creation wizard).
export function createFishTank(systemId: string, tank: { tank_number: number; volume_liters: number; fish_type: string }) {
  return api('/fish-tanks', {
    method: 'POST',
    body: {
      system_id: systemId,
      tank_number: tank.tank_number,
      size_m3: tank.volume_liters / 1000,
      volume_liters: tank.volume_liters,
      fish_type: tank.fish_type,
    },
  })
}

// Bulk-save the grow beds for a system (the endpoint upserts and computes
// equivalent_m2). Used by the creation wizard.
export function saveGrowBedsBulk(systemId: string, growBeds: unknown[]) {
  return api(`/grow-beds/system/${systemId}`, { method: 'POST', body: { growBeds } })
}

// Import a full demo system for the current user.
export async function createDemoSystem(name: string): Promise<void> {
  await api('/systems/create-demo', { method: 'POST', body: { system_name: name.trim() } })
}
