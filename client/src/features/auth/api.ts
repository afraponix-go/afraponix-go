import { z } from 'zod'
import { api } from '../../lib/apiClient'

// The backend is inconsistent: register/login return camelCase user fields,
// while GET /auth/user returns snake_case (first_name, user_role, …). Normalize
// to camelCase before validating so callers see one shape everywhere.
function normalizeUser(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const r = raw as Record<string, unknown>
  return {
    ...r,
    firstName: r.firstName ?? r.first_name,
    lastName: r.lastName ?? r.last_name,
    userRole: r.userRole ?? r.user_role,
    subscriptionStatus: r.subscriptionStatus ?? r.subscription_status,
    emailVerified: r.emailVerified ?? r.email_verified,
  }
}

// username is derived from email server-side now, but we keep it optional.
export const userSchema = z.preprocess(
  normalizeUser,
  z.object({
    id: z.number(),
    email: z.string(),
    username: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    userRole: z.string().optional(),
    subscriptionStatus: z.string().optional(),
    emailVerified: z.boolean().optional(),
  }),
)
export type User = z.infer<typeof userSchema>

const loginResponse = z.object({
  token: z.string().optional(),
  user: userSchema.optional(),
  needsVerification: z.boolean().optional(),
  message: z.string().optional(),
})

export async function login(email: string, password: string) {
  // Backend accepts email in the `username` field (WHERE username=? OR email=?).
  const data = await api('/auth/login', { method: 'POST', body: { username: email, password } })
  return loginResponse.parse(data)
}

export async function register(input: {
  email: string
  password: string
  firstName: string
  lastName: string
}) {
  const data = await api('/auth/register', { method: 'POST', body: input })
  return loginResponse.parse(data)
}

// Confirm the 6-digit code emailed after registration. On success the backend
// verifies the account and returns a token, so the user is signed straight in.
export async function verifyCode(email: string, code: string) {
  const data = await api('/auth/verify-code', { method: 'POST', body: { email, code } })
  return loginResponse.parse(data)
}

// Email another verification code.
export async function resendVerification(email: string) {
  const data = await api('/auth/resend-verification', { method: 'POST', body: { email } })
  return loginResponse.parse(data)
}

export async function fetchCurrentUser(): Promise<User> {
  const data = await api<{ user?: unknown } | unknown>('/auth/user')
  // Backend returns either { user } or the user object directly depending on route.
  const raw = data && typeof data === 'object' && 'user' in data ? (data as { user: unknown }).user : data
  return userSchema.parse(raw)
}

// Update the signed-in user's own name.
export async function updateProfile(firstName: string, lastName: string): Promise<User> {
  const data = await api<{ user?: unknown }>('/auth/profile', {
    method: 'PUT',
    body: { firstName: firstName.trim(), lastName: lastName.trim() },
  })
  return userSchema.parse(data && typeof data === 'object' && 'user' in data ? data.user : data)
}

// Change the signed-in user's own password (requires the current one).
export async function changePassword(currentPassword: string, newPassword: string) {
  return api('/auth/password', { method: 'PUT', body: { currentPassword, newPassword } })
}
