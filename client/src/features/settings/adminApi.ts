import { z } from 'zod'
import { api } from '../../lib/apiClient'

export const ROLES = ['basic', 'subscribed', 'admin'] as const
export const SUBSCRIPTIONS = ['basic', 'subscribed'] as const

const adminUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  user_role: z.string(),
  subscription_status: z.string().nullable().optional(),
  created_at: z.string().optional(),
})
export type AdminUser = z.infer<typeof adminUserSchema>

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const data = await api<unknown>('/admin/users')
  const parsed = z.array(adminUserSchema).safeParse(data)
  return parsed.success ? parsed.data : []
}

const statsSchema = z.object({
  totalSystems: z.coerce.number().optional(),
  recentRegistrations: z.coerce.number().optional(),
  users: z.array(z.object({ user_role: z.string(), subscription_status: z.string().nullable(), count: z.coerce.number() })).optional(),
})
export type AdminStats = z.infer<typeof statsSchema>

export async function fetchAdminStats(): Promise<AdminStats> {
  return statsSchema.parse(await api('/admin/stats'))
}

export function updateUser(userId: number, body: { userRole?: string; subscriptionStatus?: string }) {
  return api(`/admin/users/${userId}`, { method: 'PUT', body })
}

export function resetUserPassword(userId: number, newPassword: string) {
  return api(`/admin/users/${userId}/reset-password`, { method: 'POST', body: { newPassword } })
}

export function deleteUser(userId: number) {
  return api(`/admin/users/${userId}`, { method: 'DELETE' })
}

// ---- SMTP config (config.js) ----
const smtpSchema = z.object({
  host: z.string().optional().default(''),
  port: z.coerce.number().optional().default(587),
  secure: z.boolean().optional().default(false),
  auth: z.object({ user: z.string().optional().default(''), pass: z.string().optional().default('') }).optional().default({ user: '', pass: '' }),
  from: z.object({ name: z.string().optional().default(''), address: z.string().optional().default('') }).optional().default({ name: '', address: '' }),
  resetUrl: z.string().optional().default(''),
})
export type SmtpConfig = z.infer<typeof smtpSchema>

export async function fetchSmtp(): Promise<SmtpConfig> {
  return smtpSchema.parse(await api('/config/smtp'))
}

export function saveSmtp(cfg: SmtpConfig) {
  return api('/config/smtp', { method: 'PUT', body: cfg })
}

// Sends a test email to the signed-in admin's own address.
export function sendTestEmail() {
  return api('/config/smtp/test', { method: 'POST', body: {} })
}
