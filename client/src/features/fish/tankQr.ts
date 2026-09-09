// Deep link for a fish-tank QR label — the tank equivalent of the plant batch
// QR (see features/plants/batchQr.ts). Scanning it opens the tank's action
// sheet (add fish / record loss / update weight / move / harvest).
function scanOrigin(): string {
  return typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://go.afraponix.com'
}

// tankId is the tank's own primary key (fish_tank_id) — globally unique, but we
// still carry the system id so the resolver can point the app context at it
// without a lookup, same as the batch QR.
export function tankScanUrl(systemId: string, tankId: number): string {
  return `${scanOrigin()}/t?s=${encodeURIComponent(systemId)}&tank=${encodeURIComponent(String(tankId))}`
}
