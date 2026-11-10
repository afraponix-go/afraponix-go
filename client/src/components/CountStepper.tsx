import { useEffect, useState } from 'react'
import './CountStepper.css'

// A whole-number input with − / + buttons. The native spinner arrows only exist
// on desktop browsers, so this gives phones (and desktop alike) the same
// control. The box stays typeable and can be emptied mid-edit; only real
// numbers (clamped to min..max) reach onChange, and an empty box tidies back to
// the current value on blur.
export function CountStepper({ id, value, onChange, min = 1, max }: {
  id?: string
  value: number
  onChange: (n: number) => void
  min?: number
  max: number
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])

  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  const commit = (n: number) => {
    const c = clamp(n)
    setText(String(c))
    onChange(c)
  }
  const onType = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (digits === '') return setText('')
    commit(parseInt(digits, 10))
  }

  return (
    <div className="count-stepper">
      <button type="button" aria-label="Decrease" disabled={value <= min} onClick={() => commit(value - 1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>
      <input id={id} type="text" inputMode="numeric" pattern="[0-9]*" value={text} onChange={(e) => onType(e.target.value)} onBlur={() => setText(String(value))} />
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => commit(value + 1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><line x1="5" y1="12" x2="19" y2="12" /><line x1="12" y1="5" x2="12" y2="19" /></svg>
      </button>
    </div>
  )
}
