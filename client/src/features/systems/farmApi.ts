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
  // 'own' or 'shared' (a farm another user shared with you); permission is the
  // share level on a shared farm, null on your own.
  kind: z.enum(['own', 'shared']).optional(),
  permission: z.string().nullable().optional(),
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

export async function updateFarm(id: string, input: { name?: string; location?: string | null; display_metrics?: string[] }) {
  return api(`/farms/${id}`, { method: 'PUT', body: input })
}

// "Delete" a farm — soft-delete (archive). Recoverable via restoreFarm.
export async function deleteFarm(id: string) {
  return api(`/farms/${id}`, { method: 'DELETE' })
}

// Archived farms (owned, soft-deleted) — for the restore / permanent-delete list.
export const archivedFarmSchema = farmSchema.extend({ archived_date: z.string().nullable().optional() })
export type ArchivedFarm = z.infer<typeof archivedFarmSchema>
export async function fetchArchivedFarms(): Promise<ArchivedFarm[]> {
  const data = await api<{ farms: unknown[] }>('/farms/archived')
  return z.array(archivedFarmSchema).parse(data.farms ?? [])
}
export async function restoreFarm(id: string) {
  return api(`/farms/${id}/restore`, { method: 'POST' })
}
// Permanently delete a farm and all of its data (irreversible).
export async function purgeFarm(id: string) {
  return api(`/farms/${id}/purge`, { method: 'DELETE' })
}

// --- Farm rollup (all systems in a farm) ---
export type FarmSystemRow = {
  id: string
  system_name: string
  fish_count: number
  biomass_kg: number
  plants_growing: number
  plants_ready: number
  // Per selected metric key: a number (latest reading), null (tracked but no
  // reading yet), or absent (the system doesn't track that metric).
  metrics: Record<string, number | null>
}
export type FarmSummary = {
  farm: { id: string; name: string }
  display_metrics: string[]
  system_count: number
  totals: { fish_count: number; biomass_kg: number; plants_growing: number; plants_ready: number }
  systems: FarmSystemRow[]
}
export async function fetchFarmSummary(farmId: string): Promise<FarmSummary> {
  return api<FarmSummary>(`/farms/${farmId}/summary`)
}

// --- Farm sharing (whole-farm collaborators) ---
export type FarmShare = {
  id: number
  permission_level: 'view' | 'collaborator' | 'admin'
  email: string
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  created_at?: string
}
export async function fetchFarmShares(farmId: string): Promise<FarmShare[]> {
  const data = await api<{ shares: FarmShare[] }>(`/farm-sharing/users?farm_id=${encodeURIComponent(farmId)}`)
  return data.shares ?? []
}
export function inviteToFarm(farmId: string, email: string, permission_level: string) {
  return api('/farm-sharing/invite', { method: 'POST', body: { farm_id: farmId, email, permission_level } })
}
export function updateFarmSharePermission(shareId: number, permission_level: string) {
  return api('/farm-sharing/permission', { method: 'PUT', body: { share_id: shareId, permission_level } })
}
export function removeFarmShare(shareId: number) {
  return api(`/farm-sharing/access/${shareId}`, { method: 'DELETE' })
}
