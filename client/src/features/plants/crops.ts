import { z } from 'zod'
import { api } from '../../lib/apiClient'

const numish = z.union([z.string(), z.number()]).nullable().optional().transform((v) => (v == null || v === '' ? null : Number(v)))

export type CropOption = {
  value: string
  label: string
  days_to_harvest: number | null
  plant_spacing_cm: number | null
  custom: boolean
}

const refCropSchema = z.object({
  code: z.string(),
  name: z.string(),
  days_to_harvest: numish,
  plant_spacing_cm: numish,
})

// Merge crop-knowledge reference crops with the user's custom crops into a
// single option list for planting dropdowns.
export async function fetchCropOptions(systemId: string): Promise<CropOption[]> {
  const [refData, customData] = await Promise.all([
    api<unknown>('/crop-knowledge/crops').catch(() => null),
    api<unknown>(`/custom-crops/system/${systemId}`).catch(() => null),
  ])

  const options: CropOption[] = []

  const refs = z.object({ data: z.array(refCropSchema) }).safeParse(refData)
  if (refs.success) {
    for (const c of refs.data.data) {
      options.push({ value: c.code, label: c.name, days_to_harvest: c.days_to_harvest, plant_spacing_cm: c.plant_spacing_cm, custom: false })
    }
  }

  const customs = z.array(z.object({ crop_name: z.string() })).safeParse(customData)
  if (customs.success) {
    const known = new Set(options.map((o) => o.value.toLowerCase()))
    for (const c of customs.data) {
      if (known.has(c.crop_name.toLowerCase())) continue
      options.push({ value: c.crop_name, label: `${c.crop_name} (custom)`, days_to_harvest: null, plant_spacing_cm: null, custom: true })
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label))
}
