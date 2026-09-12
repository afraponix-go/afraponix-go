import { Link } from 'react-router-dom'
import { CompassIcon } from './icons'

// Catch-all for any URL that doesn't match a route — a typo, a stale
// bookmark, an old link to something that's moved. Without this, React
// Router falls through to its own raw, developer-facing default error
// screen. Works whether the visitor is signed in or not (see router.tsx —
// this is a top-level route, outside ProtectedRoute).
export function NotFoundPage() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24, textAlign: 'center' }}>
      <div>
        <div style={{ color: 'var(--ink-faint)', display: 'inline-flex', transform: 'scale(1.6)' }}>
          <CompassIcon />
        </div>
        <h1 style={{ fontSize: 22, margin: '16px 0 6px', color: 'var(--ink)' }}>Page not found</h1>
        <p style={{ margin: '0 0 20px', color: 'var(--ink-faint)', maxWidth: '40ch' }}>
          That page doesn't exist, or the link's gone stale.
        </p>
        <Link
          to="/"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
