# Plants Rebuild — Findings & Plan

Consolidated from a full audit of the old app (script.js 34k lines, `public/js/modules/**`, `routes/**`, live DB). Plants is the most complex area of the app. This doc is the build reference.

---

## 1. The mental model (read this first)

Plants data is **event-sourced**, unlike fish. There is **no `batches` table and no `plant_harvest` table**. Everything lives in two operational tables plus reference data:

- **`plant_allocations`** = *intent / layout*. "Crop X occupies Y% of bed Z, target spacing S." Keyed uniquely by `(system_id, grow_bed_id, crop_type)`. One bed → many crop allocations. Drives capacity planning and bed utilization (`available% = 100 − Σ percentage_allocated`).
- **`plant_growth`** = *event log*. Every planting AND harvest is a row here.
  - A **planting** = row with `new_seedlings > 0`.
  - A **harvest** = row with `plants_harvested > 0` and/or `harvest_weight > 0` (weight stored in **grams** = kg×1000).
  - A **batch** = all rows sharing a `batch_id` (`BATCH_YYYYMMDD_HHMMSS`, generated client-side).
  - **Remaining in a batch** = `Σ new_seedlings − Σ plants_harvested`. A batch "closes" implicitly when remaining hits 0 (no state flag).
  - Growth stage is **age-derived**, not a real state machine: `ready` when `age_days ≥ days_to_harvest`.
- **Reference data** (crop-knowledge subsystem): `crops` + `crop_categories` + `crop_nutrient_targets` + `growth_stages` + `nutrients`, plus per-user `custom_crops` and a `seed_varieties` list. Operational tables reference crops by **free-text `crop_type` string**, not FK — the client reconciles strings itself.

**One endpoint drives everything:** `GET /api/data/plant-growth/:systemId` returns all rows; the old client does *all* batch aggregation in JS.

---

## 2. Backend inventory

### plant_growth CRUD (`routes/data.js`) — mounted `/api/data`
- `GET /plant-growth/:systemId` — all rows, `ORDER BY date DESC`. Ownership-checked.
- `POST /plant-growth/:systemId` — insert one row (used for BOTH planting and harvest). Fields: `date, grow_bed_id, crop_type, count, harvest_weight, plants_harvested, new_seedlings, pest_control, health, growth_stage, notes, batch_id, seed_variety, batch_created_date, days_to_harvest`.
- `PUT /plant-growth/:entryId` — edit a row (does NOT update batch/seed_variety/days_to_harvest).
- `DELETE /plant-growth/:systemId/:recordId`.
- `PUT /batch/:systemId/:batchId/grow-bed {newGrowBedId}` — bulk-move a whole batch to another bed.
- `POST /import/:systemId/plant-growth {records:[]}` — bulk import.

### Allocations (`routes/plants.js`) — mounted `/api/plants`  ⚠️ **no ownership checks**
- `GET /allocations/:systemId` — allocations LEFT JOIN grow_beds (adds bed_name, bed_type, equivalent_m2).
- `POST /allocations` — upsert by (system, bed, crop). Body: `systemId, growBedId, cropType, percentageAllocated, plantsPlanted?, datePlanted?, plantSpacing?(=30)`.
- `PUT /allocations/:id` — `cropType, percentageAllocated, plantsPlanted?`.
- `DELETE /allocations/:id`.
- `GET /utilization/:systemId` — per-bed `total_allocated`, `available_percentage` (status='active' only). ← current React GrowBedsPage uses this.

### Custom crops (`routes/plants.js` + `routes/custom-crops.js`) — user-scoped
- `GET /plants/custom-crops`, `GET/PUT/DELETE /plants/custom-crops/:id`, `POST /plants/custom-crops`, `POST .../bulk-import`, `POST .../:id/submit-global` (stub).
- `GET /custom-crops/system/:systemId` — verifies system ownership, returns user's crops.
- ⚠️ **Schema mismatch:** the routes read/write `category, plant_spacing, growth_days, difficulty, season, description`, but the live `custom_crops` table has only `crop_name, target_n/p/k/ca/mg/fe/ec`. Those writes fail today. **Must fix** (migration to add columns, or trim the route).

### Seed varieties (`routes/seed-varieties.js`)
- `GET /crop/:cropType`, `GET /` (grouped), `POST /` (409 on dup), `DELETE /:id`.

### Crop knowledge (`routes/crop-knowledge.js`) — public reads, `/admin/*` gated
- `GET /crops`, `GET /crops/:code`, `GET /crops/:code/nutrient-ranges`, `GET /nutrients`, `GET /stages`, `GET /categories`, admin CRUD for crops & targets.

### Grow beds (`routes/grow-beds.js`)  ⚠️ **no ownership checks**
- `GET /system/:systemId`; `POST /system/:systemId {growBeds:[]}` (bulk upsert + deletes beds not in payload; recomputes `equivalent_m2`); `PUT /bed/:systemId/:bedNumber`; `DELETE /:bedId`.

### Plant-related tables (live schema)
- **grow_beds**: `bed_number, bed_type, bed_name, volume_liters, area_m2, length/width/height_meters, plant_capacity, vertical_count, plants_per_vertical, equivalent_m2, reservoir_volume, trough_length, trough_count, plant_spacing, reservoir_volume_liters`. `equivalent_m2` (not `area_m2`) is what allocation math reads.
- **plant_allocations**: `grow_bed_id, crop_type, percentage_allocated, plants_planted, plant_spacing(=30), date_planted, status(=active)`.
- **plant_growth**: see §1 (event log + batch cols).
- **custom_crops**: `user_id, crop_name, target_n/p/k/ca/mg/fe/ec` (see mismatch above).
- Reference: **crops, crop_categories, crop_nutrient_targets, growth_stages, nutrients, seed_varieties**.

---

## 3. Old-app flows (what to reproduce)

- **Plant tab structure:** Overview (KPI cards) · Plant Management (Beds Overview + Plants/batches) · Plant & Harvest (planting form + harvest form) · Custom Crops · Spray Programmes (separate feature).
- **Planting** (`recordPlanting`): pick bed + crop + count + stage(seedling/transplant) + seed variety + days-to-harvest + notes → generates batch_id → POST plant-growth with `new_seedlings=count`. Live "remaining plants / capacity" helper shows spacing-grid capacity.
- **Batch management:** batches computed from plant_growth; per-batch card shows crop+variety, remaining/planted, age, maturity progress bar, status. Actions: **Harvest**, **Move bed**. (Split, view-details, edit-batch are stubs/missing.)
- **Harvest** (`recordHarvest` + inline modal): pick bed+crop → checkbox-select ONE batch → plants removed (0 = fruit-only, leaves plants), weight (kg), quality → POST plant-growth with `plants_harvested`, `harvest_weight=kg×1000`, `growth_stage='harvest'`.
- **Allocation** (`addAllocation`/`editAllocation` in script.js — the *working* copy; `cropAllocationManager.js` CRUD is **unfinished**): assign crop to bed by %/area (vertical beds by vertical-count). Capacity = `floor((pct/100 × equivalent_m2 × 10000) / spacing²)`.
- **Grow bed config:** per-type forms (DWC, Flood&Drain, Media-Flow, NFT, Vertical) with dimension inputs → computes area/volume/capacity → bulk save.

---

## 4. Landmines to resolve (decide before building)

1. **Batches are computed, not stored.** Old app aggregates in JS. → Recommend a server-side `GET /plants/batches/:systemId` aggregation endpoint (mirrors the fish density-history approach), so the client consumes clean batch objects.
2. **custom_crops schema mismatch** — route writes 6 columns the table lacks. → Migration to add them, or trim route.
3. **Four divergent capacity/area formulas** (client service, server recompute, legacy script.js, data-processor) disagree: vertical density /25 vs /20; Flood&Drain volume /4 vs ×0.3; three NFT area formulas. → Pick ONE canonical module.
4. **bed_type key chaos**: client `dwc`/`flood-drain` vs server aliases `deep_water_culture`/`flood_drain`/`ebb_flow` vs unused `media/raft/tower`. → Normalize the enum.
5. **Missing ownership checks** on `/plants/allocations/*` and `/grow-beds/*` (IDOR — matches the earlier audit). → Add `verifySystemOwnership`.
6. **plant_capacity only stored for vertical & NFT**; area beds fall back to `floor(area×25)`. → Decide whether to persist for all types.
7. Old-app dead code to NOT port: `plantDataGrid.js` (orphaned), duplicate `recordPlanting/recordHarvest`, `harvestBatch` double-definition, stub `viewBatchDetails/editBatch`.

---

## 5. Proposed React architecture

Mirror the Fish pattern (SubTabLayout + feature folder + typed api + TanStack Query + Modal + mutation/invalidate). Plants becomes a sub-tabbed section:

```
PLANTS_TABS: Overview · Plantings · Harvest · Beds & Allocation · Crops
client/src/features/plants/
  api.ts            (allocations — exists; extend)
  batches.ts        (NEW: batch aggregation fetch + schema)
  plantGrowth.ts    (NEW: plant-growth CRUD actions)
  crops.ts          (NEW: crop-knowledge + custom + seed varieties)
  PlantsOverview.tsx
  Plantings.tsx     + NewPlantingModal.tsx + MoveBatchModal.tsx
  Harvest.tsx       + HarvestModal.tsx
  BedsAllocation.tsx + AllocationModal.tsx (+ bed config)
  Crops.tsx         + CustomCropModal.tsx
```

Grow beds currently live under **Settings → Grow Beds** (read-only). Allocation ties beds↔crops, so bed config likely belongs in Plants → Beds & Allocation.

---

## 6. Phased build plan

- **Phase 0 — Backend foundation & fixes**
  - `GET /plants/batches/:systemId` server-side batch aggregation.
  - Fix custom_crops schema; add ownership checks to allocations + grow-beds; canonical capacity formula module; normalize bed_type.
- **Phase 1 — Read models + Overview**
  - Client api: batches, plantGrowth, crops. Plants SubTabLayout + PLANTS_TABS. Overview KPIs (plants growing, active batches, ready to harvest, total harvested, crop varieties, bed utilization) + ready-to-harvest highlights.
- **Phase 2 — Plantings + New Planting + Move batch**
  - Batch list grouped by crop/bed, cards with age/progress/ready. New Planting modal. Move batch between beds.
- **Phase 3 — Harvest + History**
  - Harvest modal from a batch (plants removed / fruit-only, weight kg, quality). Growth/harvest history table with edit/delete.
- **Phase 4 — Beds & Allocation**
  - Bed cards + per-bed allocations + utilization. Allocation CRUD (net-new — old app never finished it). Bed configuration form per type.
- **Phase 5 — Crops**
  - Crop reference browser (crop-knowledge), custom crop CRUD, seed-variety management.

Each phase: verify in-browser against the demo system, then commit.

---

## 7. Decisions (LOCKED 2026-07-18)

1. **Scope** — ✅ Full 5 sub-tabs, phased: Overview · Plantings · Harvest · Beds & Allocation · Crops.
2. **Batch aggregation** — ✅ Server-side endpoint `GET /plants/batches/:systemId`.
3. **Backend fixes** — ✅ Fix the foundation: custom_crops schema, ownership checks (allocations + grow-beds), canonical capacity formula, normalize bed_type.
4. **Grow beds placement** — ✅ Move bed config into Plants → Beds & Allocation. Remove Settings → Grow Beds page.

**Sequencing note:** the foundation fixes are done *at the start of the phase that needs them* (not all upfront), so each phase stays independently verifiable:
- Phase 0 (now): batch aggregation endpoint + ownership checks on the endpoints Phases 1–3 consume.
- Phase 4: canonical capacity formula module + bed_type normalization (that's where beds/allocation math lives).
- Phase 5: custom_crops schema fix (that's where custom crops are edited).

## 8. Progress log
- 2026-07-18: Audit complete; plan locked.
- 2026-07-18: ✅ Phase 0 — `GET /plants/batches/:systemId` + ownership checks on /plants endpoints (commit 3d99681).
- 2026-07-18: ✅ Phase 1 — Plants SubTabLayout + Overview (KPIs, ready-to-harvest, plants-by-crop) via client batches.ts (commit 8358b46).
- 2026-07-18: ✅ Phase 2 — Plantings tab: batch list by crop, New Planting modal (crop-reference + custom crops, days-to-harvest prefill), Move batch (commit 1e2f9bb). New client modules: plantGrowth.ts, crops.ts.
- 2026-07-18: ✅ Phase 3 — Harvest tab: ready-to-harvest list + harvest history table with edit/delete; HarvestModal (plants + fruit-only, weight kg→grams, quality) available from Harvest tab and Plantings cards; EditEntryModal. Verified record/delete/edit end-to-end.
- 2026-07-18: ✅ Phase 4a — Beds & Allocation view + allocation CRUD (the flow the old app never finished): bed cards with utilization + per-crop allocations; AllocationModal (add/edit, canonical plantsForAllocation estimate, vertical vs area beds). Ownership added to allocation PUT/DELETE + grow-beds GET. Verified add/edit/delete end-to-end. New: fetchGrowBedConfigs, AllocationModal, BedsAllocation.
  - Note: demo seed has inconsistent equivalent_m2 (e.g. DWC 144 m²) and vertical plant counts that don't match vertical_count×plants_per_vertical — the canonical formula estimates differ from seeded plants_planted. Phase 4b (bed config) recomputes equivalent_m2 correctly on save.
- 2026-07-19: ✅ Phase 4b — Bed configuration CRUD in Plants → Beds & Allocation (Add/Edit/Delete bed). Canonical bed geometry in bedMath.ts (one formula set: area beds = L×W footprint; NFT/vertical = plant-sites÷25; DWC full water, media 0.4, 25 sites/m²). bed_type normalized to dwc/media/nft/vertical with alias mapping. Ownership added to grow-beds PUT-single + DELETE. Settings → Grow Beds removed. Verified: added a DWC bed (2×1×0.3 → 2.0 m² / 600 L, persisted); delete own bed 200, delete foreign bed 404 (IDOR blocked). New: bedMath.ts, BedConfigModal, saveBedConfig/deleteBed.
- 2026-07-19: ✅ Phase 5 — Crops tab: custom crop CRUD (fixed the custom_crops schema mismatch — applied the pre-existing add_custom_crops_enhanced_fields.sql migration that had never been run; init-mariadb.js updated to match), seed-variety add/delete (chips), crop reference table. New: cropsAdmin.ts, CustomCropModal, CropsPage (renamed from Crops.tsx to avoid a case-only filename collision with crops.ts on macOS). Verified: added a custom crop (all columns persist), deleted it; added + deleted a seed variety.
- ✅ **Plants rebuild COMPLETE** — all 5 sub-tabs live and verified against the demo system.
