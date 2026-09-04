// The QR on a batch label encodes a deep link, not a bare id, so a generic phone
// camera opens the app straight to the batch's action sheet. Both system and
// batch are needed — batch ids are unique only within a system — and the batch id
// is URL-encoded in the query (it contains "·", "/", spaces, "#"), which also
// keeps the "/" out of the path (Apache blocks encoded slashes there).
function scanOrigin(): string {
  return typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://go.afraponix.com'
}

// A planted (bed) batch: identified by system + batch id.
export function batchScanUrl(systemId: string, batchId: string): string {
  return `${scanOrigin()}/b?s=${encodeURIComponent(systemId)}&b=${encodeURIComponent(batchId)}`
}

// A nursery (seedling) batch: farm-level and not in a system yet, so keyed by the
// seedling batch's own id. The label is printed at sowing and stays with the tray;
// once transplanted, the scan resolver follows it to its bed batch(es).
export function seedlingScanUrl(farmId: string, seedlingId: number): string {
  return `${scanOrigin()}/b?f=${encodeURIComponent(farmId)}&sb=${encodeURIComponent(String(seedlingId))}`
}
