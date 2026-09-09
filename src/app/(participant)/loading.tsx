// Instant navigation feedback: the pine top bar (layout) stays put while this
// skeleton shows immediately on click, so a click never looks unresponsive
// while the RSC payload streams from the function.
export default function Loading() {
  return (
    <div className="shell stack" aria-busy="true">
      <div className="skel" style={{ width: 180, height: 14 }} />
      <div className="skel" style={{ width: 280, height: 34 }} />
      <div className="grid-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card stack">
            <div className="skel" style={{ width: '70%', height: 20 }} />
            <div className="skel" style={{ width: '45%', height: 12 }} />
            <div className="skel" style={{ width: '100%', height: 7, borderRadius: 999 }} />
            <div className="skel" style={{ width: '55%', height: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
