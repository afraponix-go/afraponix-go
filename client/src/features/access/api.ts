import { api } from '../../lib/apiClient'

export type AccessLevel = 'view' | 'operator' | 'collaborator' | 'admin'

// Ask the owner/admins of the farm (or system) a scanned label belongs to for access.
export function requestAccess(input: { farm_id?: string; system_id?: string; message?: string }) {
  return api<{ ok: true; notified?: number; already_has_access?: boolean; already_requested?: boolean }>('/access-requests', { method: 'POST', body: input })
}

export type AccessRequestInfo = {
  status: 'pending' | 'approved' | 'declined'
  message: string | null
  created_at: string
  decided_at: string | null
  granted_level: string | null
  granted_scope: string | null
  requester: { name: string; email: string | null }
  farm: { id: string; name: string }
  system: { id: string; name: string | null } | null
  systems: { id: string; name: string }[]
  can_share_all: boolean
}

export function fetchAccessRequest(token: string) {
  return api<AccessRequestInfo>(`/access-requests/${token}`)
}

export function decideAccessRequest(token: string, input: { action: 'approve' | 'decline'; permission_level?: AccessLevel; system_ids?: string[] | null }) {
  return api<{ ok: true; status: 'approved' | 'declined' }>(`/access-requests/${token}/decision`, { method: 'POST', body: input })
}
