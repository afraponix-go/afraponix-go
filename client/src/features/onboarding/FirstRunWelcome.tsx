import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDemoSystem } from '../systems/api'
import { startTour } from './OnboardingTour'
import './onboarding.css'

// Ask AppShell to open the add-system wizard (kept there so it owns the modal).
export const ADD_SYSTEM_EVENT = 'afraponix:add-system'

// Shown on the dashboard for a brand-new account (no systems yet): explore a
// fully-worked sample farm, or set up your own.
export function FirstRunWelcome() {
  const qc = useQueryClient()

  const demo = useMutation({
    mutationFn: () => createDemoSystem('Demo Farm'),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['systems'] })
      await qc.invalidateQueries({ queryKey: ['farms'] })
      // Let the populated dashboard render, then walk through it.
      setTimeout(startTour, 900)
    },
  })

  return (
    <div className="fr">
      <span className="fr-eyebrow">Welcome to Afraponix Go</span>
      <h1 className="fr-title">Let's get your farm on the numbers</h1>
      <p className="fr-lede">Pick a starting point — you can always add or remove systems later.</p>

      <div className="fr-cards">
        <div className="fr-card">
          <div className="fr-card-icon" aria-hidden>🌱</div>
          <h2>Explore a sample farm</h2>
          <p>Load a fully-worked demo — fish tanks, grow beds, water-quality history, plantings, harvests and programmes — so you can see every feature in action.</p>
          <button className="btn" type="button" disabled={demo.isPending} onClick={() => demo.mutate()}>
            {demo.isPending ? 'Building your sample farm…' : 'Load a sample farm'}
          </button>
          {demo.isError && <p className="fr-err">Could not load the sample. Please try again.</p>}
        </div>

        <div className="fr-card">
          <div className="fr-card-icon" aria-hidden>⚙️</div>
          <h2>Set up my own system</h2>
          <p>Add your first system — name it, then configure its fish tanks and grow beds. This is the real thing, ready for your daily readings.</p>
          <button className="btn ghost" type="button" onClick={() => window.dispatchEvent(new Event(ADD_SYSTEM_EVENT))}>
            Add a system
          </button>
        </div>
      </div>

      <p className="fr-hint">New here? <button type="button" className="link-btn" onClick={startTour}>Take the tour →</button></p>
    </div>
  )
}
