import { z } from 'zod'
import { api } from '../../lib/apiClient'

export const PERMISSIONS = [
  { value: 'view', label: 'Viewer (read-only)' },
  { value: 'collaborator', label: 'Collaborator (can edit data)' },
  { value: 'admin', label: 'Admin (full access)' },
] as const

const shareSchema = z.object({
  id: z.number(),
  permission_level: z.string(),
  status: z.string().optional(),
  created_at: z.string().optional(),
  username: z.string().nullable().optional(),
  email: z.string(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
})
export type Share = z.infer<typeof shareSchema>

export async function fetchShares(systemId: string): Promise<Share[]> {
  const data = await api<{ shares?: unknown }>(`/system-sharing/users?system_id=${encodeURIComponent(systemId)}`)
  const parsed = z.array(shareSchema).safeParse(data?.shares ?? [])
  return parsed.success ? parsed.data : []
}

export async function fetchPendingInvites(systemId: string): Promise<Share[]> {
  const data = await api<{ invitations?: unknown }>(`/system-sharing/invitations?system_id=${encodeURIComponent(systemId)}`)
  const parsed = z.array(shareSchema).safeParse(data?.invitations ?? [])
  return parsed.success ? parsed.data : []
}

export function inviteUser(systemId: string, email: string, permission_level: string) {
  return api('/system-sharing/invite', {
    method: 'POST',
    body: { system_id: systemId, email: email.trim(), permission_level },
  })
}

export function updatePermission(shareId: number, permission_level: string) {
  return api('/system-sharing/permission', { method: 'PUT', body: { share_id: shareId, permission_level } })
}

export function revokeAccess(shareId: number) {
  return api(`/system-sharing/access/${shareId}`, { method: 'DELETE' })
}
