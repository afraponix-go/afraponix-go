// The QR on a batch label encodes a deep link, not a bare id, so a generic phone
// camera opens the app straight to the batch's action sheet. Both system and
// batch are needed — batch ids are unique only within a system — and the batch id
// is URL-encoded in the query (it contains "·", "/", spaces, "#"), which also
// keeps the "/" out of the path (Apache blocks encoded slashes there).
export function batchScanUrl(systemId: string, batchId: string): string {
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://go.afraponix.com'
  return `${origin}/b?s=${encodeURIComponent(systemId)}&b=${encodeURIComponent(batchId)}`
}
