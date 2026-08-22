import { api } from '../../lib/apiClient'
import { fetchCustomCrops } from '../plants/cropsAdmin'
import { fetchBatches } from '../plants/batches'
import { fetchAllocations } from '../plants/api'
import { emptyLevels, KEYS, type Levels, type NutrientKey } from './nutrientDosing'

// A crop the user can dose for. The list is the user's own crop list (their
// per-user copy of the defaults + anything they added); crops currently planted
// in the active system are flagged so the UI can surface them first. `targets`
// holds the crop's own saved recommended levels (custom_crops.target_*), or null
// when none are set — in which case the caller falls back to the global
// reference (fetchRecommendedTargets) and then to a manual-entry empty state.
export type DosingCrop = {
  code: string
  name: string
  inSystem: boolean
  targets: Levels | null
}

// Same slug rule the planting/allocation code uses, so a crop_type recorded in
// a system (e.g. "cherry_tomatoes") lines up with a crop's code/name.
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

export async function fetchDosingCrops(systemId: string): Promise<DosingCrop[]> {
  const [crops, batches, allocations] = await Promise.all([
    fetchCustomCrops(systemId),
    fetchBatches(systemId).catch(() => []),
    fetchAllocations(systemId).catch(() => []),
  ])

  // Crops actually planted/allocated in this system (event-sourced plantings +
  // bed allocations), by slug.
  const inUse = new Set<string>()
  for (const b of batches) if (b.crop_type) inUse.add(slug(b.crop_type))
  for (const a of allocations) if (a.crop_type) inUse.add(slug(a.crop_type))

  const seen = new Set<string>()
  const list: DosingCrop[] = []
  for (const c of crops) {
    const code = c.crop_code || slug(c.crop_name)
    if (!code || seen.has(code)) continue
    seen.add(code)
    const t: Levels = {
      n: c.target_n ?? 0, p: c.target_p ?? 0, k: c.target_k ?? 0,
      ca: c.target_ca ?? 0, mg: c.target_mg ?? 0, fe: c.target_fe ?? 0,
    }
    const hasTargets = KEYS.some((k) => (t[k] || 0) > 0)
    list.push({ code, name: c.crop_name, inSystem: inUse.has(code), targets: hasTargets ? t : null })
  }

  // In-system crops first, then alphabetical within each group.
  return list.sort((a, b) => Number(b.inSystem) - Number(a.inSystem) || a.name.localeCompare(b.name))
}

// Global recommended targets from the shared reference (crop_nutrient_targets,
// via the crop-knowledge API), used when a crop has no per-user targets of its
// own. Returns null when the reference has nothing for this crop.
const NUTRIENT_CODE_TO_KEY: Record<string, NutrientKey> = {
  nitrogen: 'n', phosphorus: 'p', potassium: 'k', calcium: 'ca', magnesium: 'mg', iron: 'fe',
}

export async function fetchRecommendedTargets(code: string): Promise<Levels | null> {
  try {
    const data = await api<{ ranges?: Record<string, { target?: number }> }>(
      `/crop-knowledge/crops/${encodeURIComponent(code)}/nutrient-ranges`,
    )
    const ranges = data?.ranges
    if (!ranges) return null
    const t = emptyLevels()
    let any = false
    for (const [nc, v] of Object.entries(ranges)) {
      const key = NUTRIENT_CODE_TO_KEY[nc]
      if (key && v && typeof v.target === 'number' && Number.isFinite(v.target)) {
        t[key] = v.target
        any = true
      }
    }
    return any ? t : null
  } catch {
    return null
  }
}
