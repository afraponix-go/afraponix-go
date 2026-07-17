import { useAuth } from '../features/auth/AuthContext'

export function DashboardPage() {
  const { user } = useAuth()
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <div className="placeholder">
        <h2>You're signed in{user?.firstName ? `, ${user.firstName}` : ''} 🌱</h2>
        <p>
          This is the new React + TypeScript frontend, talking to your existing API.
          <br />
          Dashboard widgets, charts, and each feature will land here one slice at a time.
        </p>
      </div>
    </div>
  )
}

export function StubPage({ title }: { title: string }) {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      <div className="placeholder">
        <h2>{title} — coming next</h2>
        <p>This feature is queued in the migration and will be rebuilt against the existing API.</p>
      </div>
    </div>
  )
}
