'use client';

import { useEffect, useRef, useState } from 'react';
import { startPlaybackSessionAction, markAttendedAction } from './actions';

const PING_INTERVAL_MS = 15_000;

export function RecordingPlayer(props: {
  recordingModuleId: string;
  programId: string;
  weekId: string;
  driveFileId: string;
  initialEngagedSeconds: number;
  unlockSeconds: number;
  initialConfirmed: boolean;
}) {
  const [engagedSeconds, setEngagedSeconds] = useState(props.initialEngagedSeconds);
  const [confirmed, setConfirmed] = useState(props.initialConfirmed);
  const [error, setError] = useState<string | undefined>();
  const [marking, setMarking] = useState(false);
  const nonceRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startPlaybackSessionAction(props.recordingModuleId).then(({ nonce }) => {
      if (!cancelled) nonceRef.current = nonce;
    });

    const interval = setInterval(async () => {
      if (!nonceRef.current) return;
      const engaged = document.visibilityState === 'visible' && document.hasFocus();
      if (!engaged) return;

      try {
        const res = await fetch('/api/attendance/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordingModuleId: props.recordingModuleId,
            nonce: nonceRef.current,
            deltaSeconds: PING_INTERVAL_MS / 1000,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setEngagedSeconds(data.engagedSeconds);
        }
      } catch {
        // Best-effort — a dropped ping just delays the unlock slightly.
      }
    }, PING_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [props.recordingModuleId]);

  const thresholdReached = engagedSeconds >= props.unlockSeconds;
  const percent = Math.min(100, Math.round((engagedSeconds / props.unlockSeconds) * 100));

  async function handleMarkAttended() {
    setMarking(true);
    setError(undefined);
    const result = await markAttendedAction({
      recordingModuleId: props.recordingModuleId,
      programId: props.programId,
      weekId: props.weekId,
    });
    setMarking(false);
    if (result.error) setError(result.error);
    else setConfirmed(true);
  }

  return (
    <div className="stack">
      <div
        style={{
          height: 320,
          overflow: 'hidden',
          borderRadius: 'var(--r-panel)',
          background: 'var(--pine-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {props.driveFileId ? (
          <iframe
            src={`https://drive.google.com/file/d/${props.driveFileId}/preview`}
            title="Week recording"
            style={{ height: '100%', width: '100%', border: 0 }}
            allow="autoplay"
          />
        ) : (
          <span className="mono mono--onDark">Drive embed not configured</span>
        )}
      </div>

      <div className={`attend ${confirmed ? 'attend--done' : thresholdReached ? 'attend--ready' : ''}`}>
        <div className="row row--between" style={{ alignItems: 'flex-start' }}>
          <div className="grow">
            <div style={{ fontWeight: 700 }}>
              {confirmed ? 'Attendance confirmed ✓' : 'Mark yourself attended'}
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Keep this page open and focused — recording page open ≥{' '}
              {Math.round(props.unlockSeconds / 60)} min unlocks the button. This tracks page
              engagement, not that the video actually played.
            </p>
          </div>
          {!confirmed && (
            <button
              type="button"
              onClick={handleMarkAttended}
              disabled={!thresholdReached || marking}
              className="btn btn--accent btn--sm"
            >
              {marking ? 'Marking…' : 'Mark attended'}
            </button>
          )}
        </div>
        {!confirmed && (
          <div className="bar" style={{ marginTop: 'var(--s3)' }}>
            <i style={{ width: `${percent}%` }} />
          </div>
        )}
        {error && <p style={{ color: 'var(--coral)', fontSize: 14, marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  );
}
