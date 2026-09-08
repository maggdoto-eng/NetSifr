export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--s7) var(--s5)',
        background: 'var(--bg-app)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="col" style={{ alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s6)' }}>
          <div className="display-lg" style={{ color: 'var(--pine)' }}>
            NetSifr
          </div>
          <div className="mono">Learn · Attend · Volunteer</div>
        </div>
        <div className="card" style={{ boxShadow: 'var(--shadow-float)', padding: 'var(--s6)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
