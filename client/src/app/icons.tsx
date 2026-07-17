// Minimal 24×24 line icons for the bottom nav. currentColor so they inherit state.
type P = { className?: string }
const svg = (children: React.ReactNode) => (p: P) => (
  <svg className={p.className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)

export const DashboardIcon = svg(
  <>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </>,
)

export const CalculatorIcon = svg(
  <>
    <rect x="5" y="2.5" width="14" height="19" rx="2" />
    <line x1="8" y1="6.5" x2="16" y2="6.5" />
    <line x1="8" y1="11" x2="8" y2="11" />
    <line x1="12" y1="11" x2="12" y2="11" />
    <line x1="16" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="8" y2="15" />
    <line x1="12" y1="15" x2="12" y2="15" />
    <line x1="16" y1="14.5" x2="16" y2="18" />
  </>,
)

export const DataCaptureIcon = svg(
  <>
    <path d="M9 4h6a1 1 0 0 1 1 1v0a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v0a1 1 0 0 1 1-1Z" />
    <path d="M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
    <path d="M15.5 8.5 20 4l0 0-4.5 4.5-2 .5.5-2Z" />
    <line x1="8" y1="12" x2="12" y2="12" />
    <line x1="8" y1="16" x2="14" y2="16" />
  </>,
)

export const FishIcon = svg(
  <>
    <path d="M3 12c3-5 9-5 12-2 2-2 4-2.5 6-2.5-1 2-1 3-1 4.5s0 2.5 1 4.5c-2 0-4-.5-6-2.5-3 3-9 3-12-2Z" />
    <circle cx="8" cy="11" r="0.6" fill="currentColor" />
  </>,
)

export const PlantIcon = svg(
  <>
    <path d="M12 21v-8" />
    <path d="M12 13c0-3-2-5-6-5 0 3 2 5 6 5Z" />
    <path d="M12 11c0-3.5 2.5-6 7-6 0 3.5-2.5 6-7 6Z" />
  </>,
)

export const SettingsIcon = svg(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.3.9a7 7 0 0 0-2-1.2L16.2 2h-4l-.4 2.3a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L12 22h4l-.4-2.3a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.6A7 7 0 0 0 19 12Z" />
  </>,
)
