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

export const ScanIcon = svg(
  <>
    <path d="M4 8V6a2 2 0 0 1 2-2h2" />
    <path d="M16 4h2a2 2 0 0 1 2 2v2" />
    <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
    <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
    <line x1="4" y1="12" x2="20" y2="12" />
  </>,
)

export const TodayIcon = svg(
  <>
    <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    <path d="M8 3v3M16 3v3M4 9h16" />
    <path d="m8.5 13 2 2 4-4" />
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

export const SprayIcon = svg(
  <>
    <path d="M9 4h4v4H9z" />
    <path d="M9 8h4l1 3v9a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-9l1-3Z" />
    <path d="M13 5h3" />
    <path d="M13 3h2" />
    <path d="M18 6l1-1M18 9l1 0M18 12l1 1" />
  </>,
)

export const SettingsIcon = svg(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.3.9a7 7 0 0 0-2-1.2L16.2 2h-4l-.4 2.3a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L12 22h4l-.4-2.3a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.6A7 7 0 0 0 19 12Z" />
  </>,
)

export const WaterDropIcon = svg(
  <path d="M12 3c3.5 4.2 6 7.6 6 10.5a6 6 0 1 1-12 0C6 10.6 8.5 7.2 12 3Z" />,
)

export const ScaleIcon = svg(
  <>
    <path d="M12 3v18M8 21h8" />
    <path d="M5 6h14" />
    <path d="M5 6 2 11a3 3 0 0 0 6 0L5 6ZM19 6l-3 5a3 3 0 0 0 6 0l-3-5Z" />
  </>,
)

export const SeedIcon = svg(
  <>
    <path d="M12 21c4-1 7-5 7-10 0-3-2-6-7-8-5 2-7 5-7 8 0 5 3 9 7 10Z" />
    <path d="M12 13v8" />
  </>,
)

export const TransplantIcon = svg(
  <>
    <path d="M4 7h11a3 3 0 0 1 3 3v1" />
    <path d="m15 4 3 3-3 3" />
    <path d="M20 17H9a3 3 0 0 1-3-3v-1" />
    <path d="m9 20-3-3 3-3" />
  </>,
)

export const HarvestIcon = svg(
  <>
    <path d="M12 21V9" />
    <path d="M12 9c0-3-2-5-5-6 0 3 1 5.5 5 6Z" />
    <path d="M12 11c0-3.2 2.2-5.6 6-6.6 0 3.3-1.3 6-6 6.6Z" />
    <path d="M8 21h8" />
  </>,
)

export const CompassIcon = svg(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m14.5 9.5-1.8 4.2a1 1 0 0 1-.5.5L8 16l1.8-4.2a1 1 0 0 1 .5-.5Z" />
  </>,
)

export const BadgeIcon = svg(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="12" r="2" />
    <path d="M6 16c.6-1.3 1.7-2 3-2s2.4.7 3 2" />
    <line x1="14" y1="10" x2="18" y2="10" />
    <line x1="14" y1="13" x2="18" y2="13" />
  </>,
)

export const ExitIcon = svg(
  <>
    <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
    <path d="M14 16l4-4-4-4" />
    <line x1="18" y1="12" x2="8" y2="12" />
  </>,
)

export const CheckIcon = svg(<path d="m5 13 4 4L19 7" />)

export const SkipIcon = svg(
  <>
    <path d="M6 5v14l10-7Z" />
    <line x1="18" y1="5" x2="18" y2="19" />
  </>,
)

export const UndoIcon = svg(
  <>
    <path d="M4 10h9a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H9" />
    <path d="m4 10 5-5M4 10l5 5" />
  </>,
)

export const SensorIcon = svg(
  <>
    <path d="M12 20v-6" />
    <circle cx="12" cy="12" r="2" />
    <path d="M8.5 8.5a5 5 0 0 0 0 7" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M5.5 5.5a9 9 0 0 0 0 13" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </>,
)

export const FlaskIcon = svg(
  <>
    <path d="M10 3h4" />
    <path d="M10.5 3v6l-5 9.5a1.5 1.5 0 0 0 1.3 2.2h10.4a1.5 1.5 0 0 0 1.3-2.2l-5-9.5V3" />
    <path d="M7.5 15.5h9" />
  </>,
)

export const NoteIcon = svg(
  <>
    <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v5h5" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="13" y2="17" />
  </>,
)

export const HourglassIcon = svg(
  <>
    <path d="M7 3h10M7 21h10" />
    <path d="M7 3c0 4.5 3 6.5 5 7-2 .5-5 2.5-5 7M17 3c0 4.5-3 6.5-5 7 2 .5 5 2.5 5 7" />
  </>,
)

export const SaltIcon = svg(
  <>
    <path d="M12 3 4 9l3 12h10l3-12-8-6Z" />
    <path d="M9 21 12 9l3 12" />
  </>,
)

export const CameraIcon = svg(
  <>
    <path d="M9 5.5 10 4h4l1 1.5H19a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </>,
)
