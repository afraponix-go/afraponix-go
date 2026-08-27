import { useEffect } from 'react'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useAuth } from '../auth/AuthContext'
import { useSystems } from '../systems/SystemContext'
import './onboarding.css'

// Fired from the account menu to replay the tour on demand.
export const TOUR_EVENT = 'afraponix:tour'
export function startTour() { window.dispatchEvent(new Event(TOUR_EVENT)) }

const seenKey = (userId?: number) => `afraponix_tour_done_${userId ?? 'anon'}`

// The guided tour. Centered steps have no element; element steps are shown only
// when their target is on screen (so hidden overflow tabs / mobile are skipped).
function buildSteps(): DriveStep[] {
  return [
    { popover: { title: 'Welcome to Afraponix Go 🌱', description: "Let's take a 60-second tour. We'll start by setting up your farm, then show you around." } },
    { element: '[data-tour="add"]', popover: { title: 'Create your farm & first system', description: 'Start here. Add a farm, then a system — its fish tanks and grow beds. Everything else hangs off this.', side: 'bottom', align: 'end' } },
    { element: '[data-tour="nav:/"]', popover: { title: 'Dashboard', description: 'Your farm overview — totals, per-system status, charts and a top-down layout map.', side: 'top', align: 'start' } },
    { element: '[data-tour="nav:/data"]', popover: { title: 'Log', description: 'Record daily water-quality and nutrient readings, plus fish and plant data. Each reading is scored against a healthy band.', side: 'top', align: 'start' } },
    { element: '[data-tour="nav:/fish"]', popover: { title: 'Fish', description: 'Manage tanks, stocking density, feeding, growth and mortality across every tank.', side: 'top', align: 'start' } },
    { element: '[data-tour="nav:/plants"]', popover: { title: 'Plants', description: 'Seedlings, plantings, harvests and grow-bed allocation — from nursery to recorded harvest weight.', side: 'top', align: 'start' } },
    { element: '[data-tour="nav:/operations"]', popover: { title: 'Operations', description: 'Spray and dosing programmes share one calendar and logbook — build recurring programmes and record what was done.', side: 'top', align: 'center' } },
    { element: '[data-tour="nav:/calculator"]', popover: { title: 'Calculator', description: 'Fish-stocking and nutrient-dosing calculators — dose your reservoir to a crop’s targets with the least overshoot.', side: 'top', align: 'end' } },
    { element: '[data-tour="account"]', popover: { title: 'Settings & account', description: 'Farm sharing, operators, tracked metrics and your profile live here — and you can replay this tour anytime.', side: 'bottom', align: 'end' } },
    { popover: { title: "You're all set 🎉", description: 'Tap the + button to create your first system, and start turning readings into your next action.' } },
  ]
}

function runTour() {
  const steps = buildSteps().filter((s) => {
    if (!s.element) return true
    const el = document.querySelector(s.element as string) as HTMLElement | null
    return !!el && el.offsetParent !== null // visible (skips hidden/overflow targets)
  })
  const d = driver({
    showProgress: true,
    allowClose: true,
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    popoverClass: 'afx-tour',
    steps,
  })
  d.drive()
}

export function OnboardingTour() {
  const { status, user } = useAuth()
  const { systems, isLoading } = useSystems()

  // Auto-start once for a brand-new account (no systems yet).
  useEffect(() => {
    if (status !== 'authenticated' || isLoading) return
    if (systems.length > 0) return
    const key = seenKey(user?.id)
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    const t = setTimeout(runTour, 700) // let the shell paint first
    return () => clearTimeout(t)
  }, [status, isLoading, systems.length, user?.id])

  // Replay on demand from the account menu.
  useEffect(() => {
    const onStart = () => runTour()
    window.addEventListener(TOUR_EVENT, onStart)
    return () => window.removeEventListener(TOUR_EVENT, onStart)
  }, [])

  return null
}
