// Instant navigation feedback for the admin console: the rail (layout) stays,
// this skeleton fills the main column immediately while data streams in.
export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="a-topbar">
        <div className="skel" style={{ width: 160, height: 14 }} />
      </div>
      <div className="a-main stack">
        <div className="skel" style={{ width: 220, height: 32 }} />
        <div className="skel" style={{ width: 420, height: 14 }} />
        <div className="prog-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card stack">
              <div className="row row--between">
                <div className="skel" style={{ width: 30, height: 30, borderRadius: 10 }} />
                <div className="skel" style={{ width: 54, height: 20, borderRadius: 999 }} />
              </div>
              <div className="skel" style={{ width: '75%', height: 22 }} />
              <div className="skel" style={{ width: '40%', height: 12 }} />
              <div className="row" style={{ gap: 'var(--s6)' }}>
                <div className="skel" style={{ width: 40, height: 24 }} />
                <div className="skel" style={{ width: 40, height: 24 }} />
                <div className="skel" style={{ width: 40, height: 24 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
