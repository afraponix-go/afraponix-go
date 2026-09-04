# Batch QR labels + scan-to-action

Operationalises batch traceability: every plant batch gets a QR label (printed on
A4 sticker sheets) that stays physically with the batch. Operators scan it and pick
an action (Move / Harvest / Weigh / Note), which reuses the existing write endpoints.

## Payload — the deep link

The QR encodes a URL, not a bare id, so a generic phone camera opens the app
straight to the batch's action sheet:

```
https://go.afraponix.com/b?s=<systemId>&b=<encodeURIComponent(batch_id)>
```

- **Both `s` (system) and `b` (batch) are required** — batch ids are unique only
  within a system (`36/26 · Anandra` can exist in two systems).
- `batch_id` is URL-encoded in the query (`·`, `/`, spaces, `#`), sidestepping the
  Apache encoded-slash-in-path issue entirely (it's a query param, not a path).
- Built from `window.location.origin` so it points at whatever host generated it
  (in practice prod, since labels are printed from prod).

Helper: `batchScanUrl(systemId, batchId)` in `features/plants/batchQr.ts`.

## Phase 1 — generation + print  (THIS CHANGE)

- **Route** `/plants/labels` (system-scoped), reached from a **Print labels** button
  on the Plantings page. Not a browse tab — it's a print utility.
- Lists the system's batches (active by default, toggle for all), each selectable;
  "select all". Renders an **A4 sticker sheet** of labels.
- **Label** (24-up, ~63.5 × 33.9 mm — Avery L7159 / generic 3×8): QR on the left
  (~26 mm square, SVG for crisp print), and on the right the **batch number** (bold,
  mono), crop · variety, and bed.
- **Print CSS**: `@page { size: A4; margin: … }`, a fixed-mm grid, `break-inside:
  avoid` per label; on-screen it's a scaled preview with a **Print** button
  (`window.print()`). Everything but the sheet is hidden in `@media print`.
- QR via `qrcode.react` (`<QRCodeSVG>`), rendered as SVG so it stays sharp at any
  print DPI. No server round-trip; generation is entirely client-side.

## Phase 2 — scan → action  (NEXT)

- **Route** `/b` (SPA-served) reads `s` + `b`, resolves the batch (`fetchBatches`
  → find by id), shows crop/variety/bed/remaining + an **action sheet**: Move /
  Harvest / Weigh / Note → the existing modals/endpoints.
- **Scanner**: a `/scan` screen using the device camera (`getUserMedia` +
  `zxing`/`jsQR`) for in-app scanning; needs HTTPS (prod ✓). Generic-camera scans
  hit `/b` directly.
- Attribution: stamp `recorded_by` on the resulting write once the operator model
  lands (see the operator-app notes).

## Ops notes

- Greenhouses are humid — laminated / weatherproof label stock; QR tolerates
  smudging better than 1D barcodes (which also can't cleanly encode `· / #`).
- Reprints: the QR is deterministic from (system, batch id), so a lost label
  reprints identically.
