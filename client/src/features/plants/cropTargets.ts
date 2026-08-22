import { api } from '../../lib/apiClient'

// Per-system crop nutrient targets, resolving override -> global default. Shared
// by the Crops tab (editing) and the Nutrient Dosing calculator (reading).
export type Stage = 'vegetative' | 'fruiting'
export type TargetLevels = { n: number | null; p: number | null; k: number | null; ca: number | null; mg: number | null; fe: number | null }

export type CropTargets = {
  stage: Stage
  stages: Stage[]
  effective: TargetLevels | null
  source: 'system' | 'default' | 'none'
  hasOverride: boolean
  default: TargetLevels | null
  recommended: TargetLevels | null
}

export async function fetchCropTargets(systemId: string, code: string, stage: Stage): Promise<CropTargets> {
  return api<CropTargets>(`/dosing/targets/${systemId}/${encodeURIComponent(code)}?stage=${stage}`)
}

export async function saveSystemTargets(systemId: string, code: string, stage: Stage, targets: TargetLevels) {
  return api(`/dosing/targets/${systemId}/${encodeURIComponent(code)}`, { method: 'PUT', body: { stage, targets } })
}

export async function resetSystemTargets(systemId: string, code: string, stage: Stage) {
  return api(`/dosing/targets/${systemId}/${encodeURIComponent(code)}?stage=${stage}`, { method: 'DELETE' })
}

// Admin only — edits the global default (crop_nutrient_targets).
export async function saveDefaultTargets(code: string, stage: Stage, targets: TargetLevels) {
  return api(`/dosing/admin/targets/${encodeURIComponent(code)}`, { method: 'PUT', body: { stage, targets } })
}
