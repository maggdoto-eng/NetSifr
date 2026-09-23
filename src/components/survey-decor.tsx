import type { BackgroundStyle } from '@/lib/survey-schema';

function Sprout({ style }: { style: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="var(--green-500)" style={style} aria-hidden>
      <path d="M12 22c0-5 0-8 0-8m0 0c0-4 3-7 7.5-7 0 4-3.2 7-7.5 7Zm0 0C12 9 8.8 6 4.5 6c0 4 3 7 7.5 7Z" />
    </svg>
  );
}

/** Decorative layer behind the survey content (spec §13.4). Brand greens only. */
export function SurveyDecor({ background }: { background: BackgroundStyle }) {
  if (background === 'plain') return null;

  const base: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  };

  if (background === 'dots') {
    return (
      <div
        style={{
          ...base,
          opacity: 0.5,
          backgroundImage: 'radial-gradient(var(--slate-200) 1.1px, transparent 1.1px)',
          backgroundSize: '24px 24px',
        }}
      />
    );
  }

  if (background === 'gradient') {
    return <div style={{ ...base, background: 'linear-gradient(180deg, var(--green-50), #fff 60%)' }} />;
  }

  if (background === 'blobs') {
    const blob = (s: React.CSSProperties): React.CSSProperties => ({
      position: 'absolute',
      borderRadius: '50%',
      filter: 'blur(64px)',
      animation: 'nsFloaty 9s ease-in-out infinite',
      ...s,
    });
    return (
      <div style={base}>
        <div style={blob({ width: 380, height: 380, background: 'var(--green-100)', top: '-8%', right: '-6%' })} />
        <div style={blob({ width: 300, height: 300, background: 'var(--green-50)', bottom: '-10%', left: '-6%', animationDelay: '2s' })} />
        <div style={blob({ width: 220, height: 220, background: 'var(--green-100)', top: '40%', left: '10%', animationDelay: '4s', opacity: 0.7 })} />
      </div>
    );
  }

  // leaves
  const leaf = (s: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    opacity: 0.05,
    animation: 'nsFloaty 8s ease-in-out infinite',
    ...s,
  });
  return (
    <div style={base}>
      <Sprout style={leaf({ width: 120, top: '8%', left: '6%' })} />
      <Sprout style={leaf({ width: 80, top: '22%', right: '9%', animationDelay: '1.5s' })} />
      <Sprout style={leaf({ width: 150, bottom: '10%', left: '12%', animationDelay: '3s' })} />
      <Sprout style={leaf({ width: 90, bottom: '18%', right: '7%', animationDelay: '2.2s' })} />
      <Sprout style={leaf({ width: 60, top: '50%', left: '48%', animationDelay: '4s' })} />
    </div>
  );
}
