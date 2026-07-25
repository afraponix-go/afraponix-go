import './brand.css'

/**
 * The Afraponix Go lockup: the logo mark plus the wordmark.
 *
 * Own component (rather than markup repeated per page) so the app shell, the
 * landing page and the auth screens can't drift apart, and so the styles travel
 * with it instead of depending on another stylesheet already being loaded.
 */
export function Brand({ size = 26, showName = true }: { size?: number; showName?: boolean }) {
  return (
    <span className="brand">
      <img className="brand-mark" src="/logo.svg" alt="" width={size} height={size} aria-hidden />
      {showName && <span className="brand-name">Afraponix Go</span>}
    </span>
  )
}
