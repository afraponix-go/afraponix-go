// Remember where a signed-out visitor was headed (a scanned label, an emailed
// approval link) so sign-in can drop them there instead of on the dashboard.
// Only app deep links are kept — never an arbitrary URL.
const KEY = 'afraponix_return_to'
const DEEP = /^\/(b|t|access-request\/[0-9a-f]{64})(\?|$)/

export function rememberReturnTo(pathAndSearch: string) {
  try {
    if (DEEP.test(pathAndSearch)) sessionStorage.setItem(KEY, pathAndSearch)
  } catch { /* storage unavailable */ }
}

export function takeReturnTo(): string | null {
  try {
    const v = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return v && DEEP.test(v) ? v : null
  } catch {
    return null
  }
}
