import './index.css'

/**
 * Root application component.
 *
 * Phase 1 placeholder — full dashboard implemented in Phase 5.
 */
function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight"
            style={{ color: 'var(--color-accent-light)' }}>
          Stock Dashboard
        </h1>
        <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
          Financial Analysis System — Phase 1 Infrastructure ✓
        </p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 gap-4 mt-8 w-full max-w-lg">
        {[
          { label: 'Spring Boot Backend', port: ':8080', ok: true },
          { label: 'PostgreSQL', port: ':5432', ok: true },
          { label: 'Redis Cache', port: ':6379', ok: true },
          { label: 'Vite Dev Server', port: ':5173', ok: true },
        ].map(({ label, port, ok }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl px-5 py-4"
            style={{ background: 'var(--color-bg-card)' }}
          >
            <span style={{ color: 'var(--color-text-primary)' }}>{label}</span>
            <span className="flex items-center gap-2 text-sm font-mono"
                  style={{ color: 'var(--color-text-secondary)' }}>
              {port}
              <span style={{ color: ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {ok ? '●' : '○'}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
