import { api } from '../../lib/apiClient'

// Actions on a fish tank (routes/fish-inventory.js). All require a positive
// count / weight per the backend validation.
export function addFish(systemId: string, tankId: number, input: { count: number; average_weight?: number; notes?: string }) {
  return api('/fish-inventory/add-fish', {
    method: 'POST',
    body: { system_id: systemId, fish_tank_id: tankId, ...input },
  })
}

export function recordMortality(systemId: string, tankId: number, input: { count: number; cause?: string; notes?: string }) {
  return api('/fish-inventory/mortality', {
    method: 'POST',
    body: { system_id: systemId, fish_tank_id: tankId, ...input },
  })
}

export function updateWeight(systemId: string, tankId: number, input: { average_weight: number; notes?: string }) {
  return api('/fish-inventory/update-weight', {
    method: 'POST',
    body: { system_id: systemId, fish_tank_id: tankId, ...input },
  })
}

// Move fish from one tank to another within the same system.
export function moveFish(systemId: string, fromTankId: number, input: { to_tank_id: number; count: number; notes?: string }) {
  return api('/fish-inventory/move-fish', {
    method: 'POST',
    body: { system_id: systemId, from_tank_id: fromTankId, ...input },
  })
}

// Harvest fish from a tank (removal for sale/consumption). Total harvest
// weight is captured in kg; the backend derives the per-fish average.
export function harvestFish(systemId: string, tankId: number, input: { count: number; total_weight_kg?: number; notes?: string }) {
  return api('/fish-inventory/harvest', {
    method: 'POST',
    body: { system_id: systemId, fish_tank_id: tankId, ...input },
  })
}

export const MORTALITY_CAUSES = ['Disease', 'Poor water quality', 'Oxygen depletion', 'Handling stress', 'Predation', 'Unknown']
