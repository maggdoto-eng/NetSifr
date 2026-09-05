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
    <div className="flex flex-col gap-4">
      <div className="flex h-52 items-center justify-center overflow-hidden rounded-2xl bg-zinc-900">
        {props.driveFileId ? (
          <iframe
            src={`https://drive.google.com/file/d/${props.driveFileId}/preview`}
            title="Week recording"
            className="h-full w-full"
            allow="autoplay"
          />
        ) : (
          <div className="font-mono text-xs text-emerald-300">DRIVE EMBED NOT CONFIGURED</div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold">
              {confirmed ? 'Attendance confirmed' : 'Mark yourself attended'}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
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
              className="flex-none rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {marking ? 'Marking…' : 'Mark attended'}
            </button>
          )}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
