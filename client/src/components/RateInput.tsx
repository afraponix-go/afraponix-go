import './RateInput.css'

export type Rate = { amount: string; unit: string; per: string }
export const RATE_UNITS = ['ml', 'g', 'L', 'kg']
export const emptyRate = (): Rate => ({ amount: '', unit: 'ml', per: '10' })

// Structured dose/application rate — amount + unit (ml/g/L/kg) per a volume in
// litres, e.g. "100 ml per 10 L". Mirrors the record modal's number+unit style.
export function RateInput({ value, onChange, id }: { value: Rate; onChange: (r: Rate) => void; id?: string }) {
  return (
    <div className="rate-input">
      <input id={id} className="rate-amt" type="number" min="0" step="any" inputMode="decimal" placeholder="100"
        value={value.amount} onChange={(e) => onChange({ ...value, amount: e.target.value })} />
      <select className="rate-unit-sel" value={value.unit} onChange={(e) => onChange({ ...value, unit: e.target.value })} aria-label="Unit">
        {RATE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
      <span className="rate-per">per</span>
      <input className="rate-vol" type="number" min="0" step="any" inputMode="decimal" placeholder="10"
        value={value.per} onChange={(e) => onChange({ ...value, per: e.target.value })} />
      <span className="rate-l">L</span>
    </div>
  )
}
