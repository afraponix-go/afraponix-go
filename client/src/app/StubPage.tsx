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
