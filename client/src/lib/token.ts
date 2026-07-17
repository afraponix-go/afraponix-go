// Single source of truth for the auth token.
//
// The legacy app stored the JWT under BOTH `auth_token` and `authToken`, and
// different modules read different keys — a confirmed cause of "logged in but
// getting 401" flakiness (audit SEC-M1). The new app uses ONE key and, on read,
// still falls back to the two legacy keys so an existing session survives the
// cutover.
const KEY = 'afraponix_token'
const LEGACY_KEYS = ['auth_token', 'authToken']

export function getToken(): string | null {
  const v = localStorage.getItem(KEY)
  if (v) return v
  for (const k of LEGACY_KEYS) {
    const legacy = localStorage.getItem(k)
    if (legacy) return legacy
  }
  return null
}

export function setToken(token: string): void {
  localStorage.setItem(KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(KEY)
  for (const k of LEGACY_KEYS) localStorage.removeItem(k)
}
