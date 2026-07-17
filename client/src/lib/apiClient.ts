import { getToken, clearToken } from './token'

export class ApiError extends Error {
  status: number
  data: unknown
  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

type Options = Omit<RequestInit, 'body'> & { body?: unknown }

// Thin typed fetch wrapper around the existing Express API. Attaches the JWT,
// sends/parses JSON, and normalizes errors into ApiError. On 401 it clears the
// stale token so the app falls back to the login screen instead of looping.
export async function api<T = unknown>(path: string, options: Options = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const token = getToken()

  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await res.json().catch(() => null) : await res.text()

  if (!res.ok) {
    if (res.status === 401) clearToken()
    const message =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : undefined) ?? `Request failed (${res.status})`
    throw new ApiError(res.status, message, payload)
  }

  return payload as T
}
