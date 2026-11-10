import { useEffect, useState, type CSSProperties } from 'react'
import './CountStepper.css'

// Whole-number inputs with − / + buttons. The native number spinner only exists
// on desktop browsers, so this gives phones (and desktop alike) the same
// control. The box stays typeable and can be emptied mid-edit.

type Shell = {
  id?: string
  text: string
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  style?: CSSProperties
  className?: string
  minusDisabled: boolean
  plusDisabled: boolean
  onType: (raw: string) => void
  onMinus: () => void
  onPlus: () => void
  onBlur: () => void
}

function Shell(p: Shell) {
  return (
    <div className={`count-stepper${p.className ? ` ${p.className}` : ''}`} style={p.style}>
      <button type="button" aria-label="Decrease" disabled={p.disabled || p.minusDisabled} onClick={p.onMinus}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>
      <input id={p.id} type="text" inputMode="numeric" pattern="[0-9]*" placeholder={p.placeholder} disabled={p.disabled} autoFocus={p.autoFocus} value={p.text} onChange={(e) => p.onType(e.target.value)} onBlur={p.onBlur} />
      <button type="button" aria-label="Increase" disabled={p.disabled || p.plusDisabled} onClick={p.onPlus}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><line x1="5" y1="12" x2="19" y2="12" /><line x1="12" y1="5" x2="12" y2="19" /></svg>
      </button>
    </div>
  )
}

// For forms that keep the field as a string (blank = "not filled in"). Empty
// stays empty — the form's own validation decides if that's allowed; "+" on an
// empty box starts at 1 (or min), and "−" is disabled while empty.
export function NumberStepper({ id, value, onChange, min = 0, max, placeholder, disabled, autoFocus, style, className }: {
  id?: string
  value: string | number
  onChange: (v: string) => void
  min?: number
  max?: number
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  style?: CSSProperties
  className?: string
}) {
  const text = String(value ?? '')
  const n = text.trim() === '' || isNaN(Number(text)) ? null : Number(text)
  const cap = (x: number) => (max != null ? Math.min(max, x) : x)
  return (
    <Shell
      id={id} text={text} placeholder={placeholder} disabled={disabled} autoFocus={autoFocus} style={style} className={className}
      minusDisabled={n == null || n <= min}
      plusDisabled={n != null && max != null && n >= max}
      onType={(raw) => {
        const digits = raw.replace(/\D/g, '')
        onChange(digits === '' ? '' : String(cap(parseInt(digits, 10))))
      }}
      onMinus={() => n != null && onChange(String(Math.max(min, n - 1)))}
      onPlus={() => onChange(String(n == null ? cap(Math.max(min, 1)) : cap(n + 1)))}
      onBlur={() => { if (n != null && n < min) onChange(String(min)) }}
    />
  )
}

// For a required count held as a number (Add system wizard). Emptying the box is
// allowed while typing; it tidies back to the current value on blur.
export function CountStepper({ id, value, onChange, min = 1, max }: {
  id?: string
  value: number
  onChange: (n: number) => void
  min?: number
  max: number
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])

  const commit = (x: number) => {
    const c = Math.max(min, Math.min(max, x))
    setText(String(c))
    onChange(c)
  }
  return (
    <Shell
      id={id} text={text}
      minusDisabled={value <= min}
      plusDisabled={value >= max}
      onType={(raw) => {
        const digits = raw.replace(/\D/g, '')
        if (digits === '') return setText('')
        commit(parseInt(digits, 10))
      }}
      onMinus={() => commit(value - 1)}
      onPlus={() => commit(value + 1)}
      onBlur={() => setText(String(value))}
    />
  )
}
