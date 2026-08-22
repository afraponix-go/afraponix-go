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

export const CROPS = [
  { code: 'lettuce', name: 'Lettuce' },
  { code: 'tomato', name: 'Tomatoes' },
  { code: 'cucumber', name: 'Cucumbers' },
  { code: 'basil', name: 'Basil' },
  { code: 'garlic', name: 'Garlic' },
  { code: 'potato', name: 'Potatoes' },
]

export type SystemType = 'hydroponic' | 'aquaponic'

// Target levels (ppm). Aquaponic targets are lower — the fish supply some.
export const CROP_TARGETS: Record<SystemType, Record<string, Levels>> = {
  hydroponic: {
    lettuce: { n: 120, p: 35, k: 180, ca: 80, mg: 30, fe: 2 },
    tomato: { n: 190, p: 50, k: 275, ca: 150, mg: 50, fe: 4 },
    cucumber: { n: 160, p: 45, k: 210, ca: 120, mg: 40, fe: 3.5 },
    basil: { n: 130, p: 30, k: 160, ca: 90, mg: 35, fe: 2.5 },
    garlic: { n: 175, p: 40, k: 200, ca: 100, mg: 45, fe: 3 },
    potato: { n: 150, p: 65, k: 250, ca: 60, mg: 40, fe: 3 },
  },
  aquaponic: {
    lettuce: { n: 80, p: 15, k: 120, ca: 60, mg: 20, fe: 1.5 },
    tomato: { n: 120, p: 35, k: 200, ca: 100, mg: 40, fe: 3 },
    cucumber: { n: 100, p: 30, k: 150, ca: 80, mg: 30, fe: 2.5 },
    basil: { n: 90, p: 20, k: 110, ca: 70, mg: 25, fe: 2 },
    garlic: { n: 100, p: 20, k: 150, ca: 80, mg: 35, fe: 2 },
    potato: { n: 90, p: 30, k: 180, ca: 45, mg: 30, fe: 2 },
  },
}

export type Product = { name: string } & Levels

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

// Greedy per-element solver (the aquaponics.africa algorithm).
export function computeDose(
  volumeL: number,
  current: Levels,
  target: Levels,
  products: Product[],
): { doses: DoseResult[]; achieved: Levels; finalLevels: Levels } {
  const neededGrams = emptyLevels()
  const achieved = emptyLevels()
  for (const k of KEYS) {
    const needed = Math.max(0, (target[k] || 0) - (current[k] || 0))
    neededGrams[k] = (volumeL * needed) / 1000 // ppm × L ÷ 1000 = grams of element
  }

  const amounts = new Array(products.length).fill(0)
  for (const key of KEYS) {
    if ((target[key] || 0) > 0 && achieved[key] < neededGrams[key]) {
      let bestIndex = -1
      let bestPct = -1
      products.forEach((p, i) => {
        const pct = p[key] || 0
        if (pct > bestPct) {
          bestPct = pct
          bestIndex = i
        }
      })
      if (bestIndex >= 0 && bestPct > 0) {
        const amount = (neededGrams[key] - achieved[key]) / (bestPct / 100)
        amounts[bestIndex] += amount
        for (const k of KEYS) achieved[k] += amount * ((products[bestIndex][k] || 0) / 100)
      }
    }
  }

  // Projected levels after dosing (ppm): current + added element ÷ volume.
  const finalLevels = emptyLevels()
  for (const k of KEYS) {
    finalLevels[k] = (current[k] || 0) + (volumeL > 0 ? (achieved[k] * 1000) / volumeL : 0)
  }

  const doses = products.map((p, i) => ({ name: p.name, grams: amounts[i] })).filter((d) => d.grams > 0)
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
