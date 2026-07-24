import { z } from 'zod'
import { api } from '../../lib/apiClient'

// Shape returned by the existing backend (routes/auth.js). username is derived
// from email server-side now, but we keep it optional for compatibility.
export const userSchema = z.object({
  id: z.number(),
  email: z.string(),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  userRole: z.string().optional(),
  subscriptionStatus: z.string().optional(),
  emailVerified: z.boolean().optional(),
})
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
