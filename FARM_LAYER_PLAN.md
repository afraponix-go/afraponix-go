# Farm layer — implementation plan

Introduce a **Farm** entity above aquaponics **systems**. A user owns one (or more) farms;
systems belong to a farm; plant batches and fish stock can be moved between systems (and
farms). Planned 2026-08-24; **not yet built**. Decisions below are LOCKED.

## Locked decisions
1. **Farms are first-class, UI assumes one.** `farms.owner_id` allows N farms per user; the farm
   switcher only appears when a user has >1. "Move a system/stock between farms" works without rework.
2. **Sharing stays per-system for Phase 1.** `system_shares` is unchanged; a farm owner sees all their
   systems. Farm-level staff/members ("invite to the whole farm") is a later phase.
3. **Plant moves are event-based transfers (keep history).** Close the batch in the source system,
   open a linked batch in the destination on a chosen bed, and write a `stock_transfers` audit row —
   NOT a destructive `system_id` reassignment.

## Current state (mapped 2026-08-24)
- `systems`: string PK `system_${uuid}` (`routes/systems.js:16`), `user_id` → owner. Flat per-user
  list, **no grouping**. Created in `POST /systems` (systems.js:70/94); demo via `/create-demo`.
- `system_shares`: per-system grant (owner_id, shared_with_id, permission_level view/collaborator/admin,
  status). `/system-sharing invite` **auto-accepts** (status='accepted'); pending is unused.
- **Canonical access helper: `utils/systemAccess.js → getSystemAccess(systemId, userId, pool)`** =
  owns system OR accepted share. `WRITE_LEVELS={collaborator,admin}`.
- **Access is inconsistent (must fix):**
  - Camp A (uses the helper): `data.js` (~30 sites, wrapper `verifySystemOwnership`), `fish.js`,
    `plants.js`, `grow-beds.js`, `fish-inventory.js`, `systems.js`.
  - Camp B (own owner-only checks, IGNORE shares): `seedlings.js` (`ownsSystem` l.8), `dosing.js`
    (l.218, 10 sites), `spray.js` (l.24, 8 sites), `sensors.js`, `fish-tanks.js`, `credentials.js`,
    `custom-crops.js`, `seed-varieties.js`.
- **JWT carries no system/ownership info** — access resolved fresh per request (same rationale as the
  `isAdmin` DB re-check). Farm membership will also be a live DB lookup.
- ~27 tables carry `system_id` **redundantly** on child rows; every query filters on it.
- Frontend: one `SystemContext` (`activeId` + `localStorage afraponix_active_system`), one switcher in
  `AppShell.tsx`, creation in `AddSystemModal.tsx`. **58 query keys across 34 files** key off `activeId`
  but only need "which system is active" → a farm layer above them needs **no changes** to those.
- **Naming clash:** `features/farm/FarmLayout.tsx` is the visual tank/bed **map** at `/layout` — rename
  to "Layout" to free "Farm" for the org entity.

### Plants & fish move mechanics
- **Plants:** event-sourced in `plant_growth` (a batch = rows sharing client-timestamp `batch_id`,
  **no uniqueness constraint**). Bed-move (`PUT /data/batch/:sys/:batch/grow-bed`, data.js:615) is a
  **destructive in-place UPDATE, no history**. `grow_bed_id` is a plain int (no FK). Transplant
  (`POST /seedlings/:id/transplant`) creates a linked plant_growth row (does preserve history).
- **Fish:** stock = `fish_tanks.current_fish_count` + append-only `fish_events`. `fish_inventory` table
  is effectively unused. **`POST /fish-inventory/move-fish` already moves stock between tanks in one
  system** (transaction: decrement/increment counts, log `move_out`+`move_in`) — the template for
  cross-system moves. `fish_health/feeding/harvest` carry `system_id` redundantly.
- A cross-system move must remap bed/tank ids to the destination and stamp the correct `system_id` on
  child rows — a bare `system_id` rewrite orphans records.

## Data model changes
- **`farms`**: `id VARCHAR PK (farm_${uuid})`, `owner_id INT → users`, `name`, `location` NULL, `created_at`.
- **`systems.farm_id VARCHAR → farms(id)`** — nullable through migration, then app-enforced.
- **Keep `systems.user_id`** (now "created by / primary owner"); access flows through the farm.
- **`stock_transfers`** (Phase 3): append-only — `id, kind(plant|fish), batch_id, from_system, to_system,
  from_bed, to_bed, from_tank, to_tank, count, moved_by, moved_at, notes`.

## Access control changes
- `getSystemAccess` gains a **farm-owner (later: farm-member)** branch: access if the user owns/belongs
  to the system's farm OR has an accepted system-share. Initially behaviour-neutral.
- **Prerequisite:** migrate Camp-B routes onto the shared helper so the farm branch applies everywhere.
- Open sub-decision for later: should a farm-owner who isn't `systems.user_id` be able to edit/delete a
  system? (Only matters once farms have multiple members — Phase 4.)

## Migration (idempotent, bootstrap-registered)
1. Create `farms`; `ALTER systems ADD COLUMN IF NOT EXISTS farm_id`.
2. One default farm per user owning ≥1 system ("<name>'s Farm"); backfill `farm_id`. A **shared** system
   goes in its **owner's** farm (shared users keep access via `system_shares`).
3. Guarded/re-runnable; skip users who already have a farm.

## Frontend
- `FarmContext` (or extend SystemContext): `activeFarmId` (+ `afraponix_active_farm`), `fetchFarms`,
  expose only the active farm's systems from `useSystems()`; farm-scope the active-system fallback.
- Farm switcher in the header (left of system switcher; hidden when 1 farm).
- `AddSystemModal` attaches `farm_id`; "create your farm" onboarding for new users.
- Rename "Farm Layout" tab → "Layout".

## Move stock (Phase 3)
- **Fish:** extend `move-fish` to cross-system/farm — relax same-system guard, require destination tank
  in target system, decrement/increment, log `move_out`(source sys)/`move_in`(dest sys). Write-access on
  both systems.
- **Plants:** event-based transfer — close source batch (record moved-out count), open a linked batch in
  the destination on a chosen bed, write a `stock_transfers` row both ways. Access on both.
- **v1 scope:** only systems/farms the user can access (owns or shared into). Cross-owner transfers are a
  later, consent-based flow.

## Phasing (each ships to prod independently; app keeps working)
- **Phase 0 — cleanup: ✅ DONE (2026-08-24).** Migrated `seedlings.js`, `spray.js`, `dosing.js`,
  `fish-tanks.js` onto `utils/systemAccess` (`canReadSystem` for GETs, `canWriteSystem` for mutations;
  row-fetch helpers `ownedPlan`/`ownedDosingProgramme`/`ownedDosingLog`/`accessibleSeedling` now gate via
  the helper). Behaviour-neutral for owners (verified: reads + create/edit/delete all 200); a collaborator
  share now gets read+write where it was previously denied (verified). **DEFERRED: `sensors.js` +
  `credentials.js`** (ThingsBoard/device-integration config) stay owner-only for now — a defensible stance
  for sensitive integration config, and it remains correct for owners through Phases 1–3 (a system's
  `user_id` doesn't change under farm re-parenting within the same owner). Revisit when farm-level staff
  land (Phase 4). `custom-crops.js`/`seed-varieties.js` are PER-USER resources, not system-scoped — no change.
- **Phase 1 — farm entity, invisible: ✅ DONE (2026-08-24).** `farms` table + `systems.farm_id` (migration `2026-08-farms.sql`, no FK on farm_id — loose-ref style, idempotent) + idempotent backfill `2026-08-farms-backfill.js` (one farm per owner "<first>'s Farm", assigns their systems; reuses existing farm so re-runs are no-ops). `utils/farms.js` `ensureUserFarm` shared by backfill + system creation. `getSystemAccess` grants owner via `s.user_id OR farms.owner_id` (LEFT JOIN farms) + shares. New `routes/farms.js` (GET/POST/PUT/DELETE, owner-only, delete refused while systems attached) at `/api/farms`. `POST /systems` + `create-demo` assign farm_id. Verified on dev: 22 systems→6 owners, 0 NULL farm_id, idempotent; CRUD + new-system farm_id + owner access + sharing all correct; dashboard unchanged.
- **Phase 2 — farm in the UI: ✅ DONE (2026-08-24).** `SystemContext` now also loads farms (`farmApi.ts`), tracks `activeFarmId` (localStorage `afraponix_active_farm`), and scopes `systems` to the active farm; exposes `farms` (own farms + synthetic "Shared with me" group when shared systems exist), `activeFarm`, `setActiveFarmId`, plus `allSystems`. Header farm switcher in `AppShell` (shown only at >1 farm option; `.farm-switch`). `AddSystemModal` passes `farm_id` (active own farm, else backend default). Farm settings tab (`FarmsSettings.tsx` at `/settings/farms`) — create/rename/delete (delete refused while systems attached)/switch. Renamed the "Farm Layout" sub-tab → "Layout". **Reconcile bug fixed:** the effects must gate on `authed` too — before auth resolves, the disabled queries report `isLoading:false` with empty data, which otherwise reset a valid persisted farm selection. Verified on dev: single-farm (no switcher), multi-farm switch scopes systems + persists across reload, empty farm graceful, CRUD. The 58 activeId-scoped queries were untouched.
- **Phase 3 — move stock:** `stock_transfers` + fish cross-system move + plant batch transfer + destination pickers.
- **Phase 4 (later):** farm-level sharing/members (staff on a whole farm) + farm rollup dashboards.

Related memory: [[per-user-vs-per-system-data]] (reference/settings are per-user; logs/programmes per-system),
[[prod-update-discipline]] (idempotent migrations, straight-to-prod), [[jwt-role-staleness]] (live DB lookups
not JWT), [[farm-overview-feature]] (the existing SVG map — the naming-clash source).
