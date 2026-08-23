import { api } from '../../lib/apiClient'

// Nutrient dosing, matching the aquaponics.africa hydroponic/aquaponic dosing
// calculator: crop target presets (hydroponic vs aquaponic), a fertiliser
// product list with their %-composition, and a greedy per-element solver that
// doses each element with the richest product while crediting everything that
// product also supplies (so e.g. calcium nitrate counts toward both N and Ca).

export type NutrientKey = 'n' | 'p' | 'k' | 'ca' | 'mg' | 'fe'
export const KEYS: NutrientKey[] = ['n', 'p', 'k', 'ca', 'mg', 'fe']

export type Levels = Record<NutrientKey, number>

// Element → the reading metric it maps to (nitrogen is read as nitrate).
export const NUTRIENTS: { key: NutrientKey; label: string; readKey: string }[] = [
  { key: 'n', label: 'Nitrogen (N)', readKey: 'nitrate' },
  { key: 'p', label: 'Phosphorus (P)', readKey: 'phosphorus' },
  { key: 'k', label: 'Potassium (K)', readKey: 'potassium' },
  { key: 'ca', label: 'Calcium (Ca)', readKey: 'calcium' },
  { key: 'mg', label: 'Magnesium (Mg)', readKey: 'magnesium' },
  { key: 'fe', label: 'Iron (Fe)', readKey: 'iron' },
]

export type Product = { name: string; ph_direction?: 'up' | 'down' | null; ph_strength?: number | null; rate_unit?: string | null } & Levels

// Fertiliser products and their element composition (%). Users can edit/extend.
export const DEFAULT_PRODUCTS: Product[] = [
  { name: 'General Hydroponics Shiman 2-1-2', n: 18.9, p: 8.4, k: 17.1, ca: 0, mg: 0, fe: 0 },
  { name: 'Calcium Nitrate', n: 15.5, p: 0, k: 0, ca: 19, mg: 0, fe: 0 },
  { name: 'Iron Micromix (7%)', n: 0, p: 0, k: 0, ca: 0, mg: 0, fe: 7 },
  { name: 'Magnesium Sulphate', n: 0, p: 0, k: 0, ca: 0, mg: 10, fe: 0 },
  { name: 'Mono Potassium Phosphate', n: 0, p: 22.7, k: 28.7, ca: 0, mg: 0, fe: 0 },
  { name: 'Calcium Chloride', n: 0, p: 0, k: 0, ca: 28, mg: 0, fe: 0 },
  { name: 'Potassium Chloride', n: 0, p: 0, k: 46, ca: 0, mg: 0, fe: 0 },
]

export const emptyLevels = (): Levels => ({ n: 0, p: 0, k: 0, ca: 0, mg: 0, fe: 0 })

// EC estimate from a set of ppm levels: ~700 ppm ≈ 1 mS/cm.
export function ecFromLevels(levels: Levels): number {
  return KEYS.reduce((s, k) => s + (levels[k] || 0), 0) / 700
}

export type DoseResult = { name: string; grams: number }

// Least-overshoot solver. The old greedy "dose each element with the single
// richest product" badly overshot co-nutrients (e.g. using a 2-1-2 blend to fix
// nitrogen dumped huge amounts of P and K). Instead we solve for the product
// amounts that best FIT the gaps: minimise the weighted squared error between
// what the mix delivers and each nutrient's remaining gap, with amounts ≥ 0.
//
// Errors are weighted by 1/target so every nutrient counts on a relative scale
// (otherwise nitrogen's big numbers would drown out a tenfold iron overshoot).
// Nutrients already at/above target get a gap of 0, so adding more is penalised —
// the solver avoids overshooting them where it can. Solved with non-negative
// multiplicative updates (Lee–Seung), which suit this all-non-negative system.
export function computeDose(
  volumeL: number,
  current: Levels,
  target: Levels,
  products: Product[],
): { doses: DoseResult[]; achieved: Levels; finalLevels: Levels } {
  const n = products.length
  if (n === 0 || volumeL <= 0) return { doses: [], achieved: emptyLevels(), finalLevels: { ...current } }

  // Weighted per-gram contribution matrix A[k][i] (ppm of k per gram of product i)
  // and gap vector b[k], both divided by the nutrient's scale for relative error.
  const scale: Levels = emptyLevels()
  const b: number[] = []
  const A: number[][] = []
  KEYS.forEach((k, ki) => {
    scale[k] = Math.max(target[k] || 0, 1)
    b[ki] = Math.max(0, (target[k] || 0) - (current[k] || 0)) / scale[k]
    A[ki] = products.map((p) => ((p[k] || 0) * 10) / volumeL / scale[k]) // (pct/100)*1000/V, weighted
  })

  // AᵀB (constant) for the multiplicative update.
  const AtB = new Array(n).fill(0)
  for (let i = 0; i < n; i++) for (let ki = 0; ki < KEYS.length; ki++) AtB[i] += A[ki][i] * b[ki]

  // Minimise ||A x − b||² over x ≥ 0: x_i ← x_i · (AᵀB)_i / (AᵀA x)_i.
  const x = new Array(n).fill(1)
  for (let iter = 0; iter < 500; iter++) {
    const Ax = KEYS.map((_, ki) => {
      let s = 0
      for (let i = 0; i < n; i++) s += A[ki][i] * x[i]
      return s
    })
    for (let i = 0; i < n; i++) {
      let denom = 0
      for (let ki = 0; ki < KEYS.length; ki++) denom += A[ki][i] * Ax[ki]
      if (AtB[i] <= 0) { x[i] = 0; continue } // product supplies nothing wanted
      x[i] = (x[i] * AtB[i]) / (denom + 1e-12)
    }
  }

  // Drop numerical dust (products that ended up contributing negligibly).
  const maxG = Math.max(0, ...x)
  const cutoff = Math.max(0.05, maxG * 0.005)
  for (let i = 0; i < n; i++) if (x[i] < cutoff) x[i] = 0

  const achieved = emptyLevels()
  for (const k of KEYS) for (let i = 0; i < n; i++) achieved[k] += x[i] * ((products[i][k] || 0) / 100)
  const finalLevels = emptyLevels()
  for (const k of KEYS) finalLevels[k] = (current[k] || 0) + (achieved[k] * 1000) / volumeL

  const doses = products.map((p, i) => ({ name: p.name, grams: x[i] })).filter((d) => d.grams > 0)
  return { doses, achieved, finalLevels }
}

// Group the dosed products into mixes that must not be combined in one stock
// concentrate — calcium salts precipitate with phosphates/sulphates. Mirrors
// the source calculator: Mix A calcium-led, Mix B potassium/phosphorus, Mix C
// the rest (micros).
export type MixGroups = { A: DoseResult[]; B: DoseResult[]; C: DoseResult[] }
export function mixSchedule(doses: DoseResult[], products: Product[]): MixGroups {
  const byName = new Map(products.map((p) => [p.name, p]))
  const A: DoseResult[] = []
  const B: DoseResult[] = []
  const C: DoseResult[] = []
  for (const d of doses) {
    const p = byName.get(d.name)
    if (p && p.ca > 0 && p.ca >= p.k) A.push(d)
    else if (p && (p.k > 0 || p.p > 0)) B.push(d)
    else C.push(d)
  }
  return { A, B, C }
}

// Fertiliser incompatibility (mirrors mixSchedule): calcium-led products (A)
// must not be dosed the same day as phosphate/potassium products (B) — they
// precipitate. Micros/other (C) are neutral and compatible with either.
export type MixGroup = 'A' | 'B' | 'C'
export const MIX_LABEL: Record<MixGroup, string> = { A: 'Calcium mix', B: 'Phosphate / potassium mix', C: 'Micros / other' }
export function mixGroupOf(p: { ca?: number; k?: number; p?: number }): MixGroup {
  const ca = p.ca || 0, k = p.k || 0, ph = p.p || 0
  if (ca > 0 && ca >= k) return 'A'
  if (k > 0 || ph > 0) return 'B'
  return 'C'
}
// Two mix groups clash iff one is A (calcium) and the other is B (phosphate/K).
export const groupsClash = (a: MixGroup, b: MixGroup) => (a === 'A' && b === 'B') || (a === 'B' && b === 'A')

// Recommended grams of a fertiliser to raise a nutrient from current to target
// over a reservoir volume, given the fertiliser's % of that nutrient. Null when
// it can't be computed (no gap, or the product doesn't supply the nutrient).
export function recommendDose(targetPpm: number, currentPpm: number, volumeL: number, pct: number): number | null {
  const gap = (targetPpm || 0) - (currentPpm || 0)
  if (!(gap > 0) || !(volumeL > 0) || !(pct > 0)) return null
  return Math.round(((gap * volumeL) / 1000 / (pct / 100)) * 10) / 10 // grams, 0.1 g
}

// Safe maximum increase per nutrient per week (ppm) — large corrections are
// ramped up gradually rather than dosed all at once (which shocks the system).
export const MAX_WEEKLY_PPM: Levels = { n: 30, p: 10, k: 25, ca: 25, mg: 10, fe: 1 }

// Weeks needed to close the biggest gap without exceeding any nutrient's weekly cap.
export function weeksToReach(target: Levels, current: Levels, caps: Levels): number {
  let weeks = 1
  for (const k of KEYS) {
    const gap = (target[k] || 0) - (current[k] || 0)
    const cap = caps[k] || 0
    if (gap > 0 && cap > 0) weeks = Math.max(weeks, Math.ceil(gap / cap))
  }
  return weeks
}

// Per-nutrient weekly recommendation: total grams to close the gap, the weeks it
// safely takes (gap ÷ cap), and the per-week grams.
export function recommendWeekly(targetPpm: number, currentPpm: number, volumeL: number, pct: number, capPpm: number): { total: number | null; weekly: number | null; weeks: number } {
  const gap = (targetPpm || 0) - (currentPpm || 0)
  if (!(gap > 0) || !(volumeL > 0) || !(pct > 0)) return { total: null, weekly: null, weeks: 0 }
  const total = (gap * volumeL) / 1000 / (pct / 100)
  const weeks = capPpm > 0 ? Math.max(1, Math.ceil(gap / capPpm)) : 1
  return { total: Math.round(total * 10) / 10, weekly: Math.round((total / weeks) * 10) / 10, weeks }
}

// The signed-in user's saved fertiliser list (null = not customised → defaults).
export async function fetchUserProducts(): Promise<Product[] | null> {
  const data = await api<{ products: Product[] | null }>(`/dosing/products`)
  // Treat an empty saved list as "not customised" so a user can never be left
  // with zero fertilisers (and no possible dose) — callers fall back to defaults.
  return Array.isArray(data?.products) && data.products.length > 0 ? data.products : null
}

export async function saveUserProducts(products: Product[]): Promise<void> {
  await api(`/dosing/products`, { method: 'PUT', body: { products } })
}

// Current levels from the system's latest readings (single nutrient_readings
// table). Top-level or under a `nutrients` key.
export async function fetchLatestLevels(systemId: string): Promise<Record<string, number>> {
  const data = await api<Record<string, unknown>>(`/data/nutrients/latest/${systemId}`)
  const map = (data && typeof data === 'object' && 'nutrients' in data ? (data as { nutrients: unknown }).nutrients : data) as
    | Record<string, unknown>
    | undefined
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(map ?? {})) {
    const raw = v && typeof v === 'object' && 'value' in v ? (v as { value: unknown }).value : v
    const n = Number(raw)
    if (Number.isFinite(n)) out[k] = n
  }
  return out
}
