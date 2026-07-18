import { z } from 'zod'
import { api } from '../../lib/apiClient'

export const OPERATION_TYPES = [
  'Water change',
  'Chemical addition',
  'Cleaning',
  'Maintenance',
  'Fish transfer',
  'System downtime',
  'Other',
] as const

export type OpField = 'water_volume' | 'chemical_added' | 'amount_added' | 'downtime_duration'

// Which contextual fields each operation type shows (notes is always shown).
export const OP_FIELDS: Record<string, OpField[]> = {
  'Water change': ['water_volume'],
  'Chemical addition': ['chemical_added', 'amount_added'],
  'Cleaning': ['downtime_duration'],
  'Maintenance': ['downtime_duration'],
  'Fish transfer': [],
  'System downtime': ['downtime_duration'],
  'Other': ['water_volume', 'chemical_added', 'amount_added', 'downtime_duration'],
}

export const OP_FIELD_META: Record<OpField, { label: string; unit?: string; kind: 'number' | 'text'; placeholder: string; step?: string }> = {
  water_volume: { label: 'Water changed', unit: 'L', kind: 'number', placeholder: 'e.g. 500', step: '1' },
  downtime_duration: { label: 'Downtime', unit: 'hrs', kind: 'number', placeholder: 'e.g. 2', step: '0.5' },
  chemical_added: { label: 'Chemical added', kind: 'text', placeholder: 'e.g. pH Down' },
  amount_added: { label: 'Amount', kind: 'text', placeholder: 'e.g. 50 mL' },
}

export type OperationInput = {
  date: string
  operation_type: string
  water_volume?: number
  chemical_added?: string
  amount_added?: string
  downtime_duration?: number
  notes?: string
}

export async function createOperation(systemId: string, input: OperationInput) {
  return api(`/data/operations/${systemId}`, { method: 'POST', body: input })
}

const num = z.union([z.string(), z.number()]).nullable().optional().transform((v) => (v == null || v === '' ? null : Number(v)))

const operationRow = z.object({
  id: z.number().optional(),
  date: z.string().nullable().optional(),
  operation_type: z.string().nullable().optional(),
  water_volume: num,
  chemical_added: z.string().nullable().optional(),
  amount_added: z.string().nullable().optional(),
  downtime_duration: num,
  notes: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
})
export type Operation = z.infer<typeof operationRow>

export async function fetchOperations(systemId: string, limit = 20): Promise<Operation[]> {
  const data = await api<unknown[]>(`/data/operations/${systemId}?limit=${limit}`)
  const parsed = z.array(operationRow).safeParse(data)
  return parsed.success ? parsed.data : []
}
