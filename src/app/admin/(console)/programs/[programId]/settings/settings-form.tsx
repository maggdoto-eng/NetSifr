'use client';

import { useActionState, useState } from 'react';
import { updateSettingsAction } from './actions';

export function SettingsForm({
  cohortId,
  defaults,
  currentWeek,
  weekCount,
  datesLabel,
}: {
  cohortId: string;
  defaults: { title: string; cohortLabel: string; summary: string; attendanceUnlockMinutes: number };
  currentWeek: number;
  weekCount: number;
  datesLabel: string;
}) {
  const [minutes, setMinutes] = useState(defaults.attendanceUnlockMinutes);
  const [state, action, pending] = useActionState(
    updateSettingsAction.bind(null, cohortId),
    undefined,
  );

  return (
    <form action={action} className="stack">
      <div className="card stack">
        <h2 className="display-sm">Identity</h2>
        <div className="field">
          <label htmlFor="title" className="mono">
            Title
          </label>
          <input id="title" name="title" defaultValue={defaults.title} required />
        </div>
        <div className="row wrap" style={{ gap: 'var(--s4)' }}>
          <div className="field grow" style={{ minWidth: 200 }}>
            <label htmlFor="cohortLabel" className="mono">
              Cohort label
            </label>
            <input id="cohortLabel" name="cohortLabel" defaultValue={defaults.cohortLabel} required />
          </div>
          <div className="field grow" style={{ minWidth: 200 }}>
            <label className="mono">Dates</label>
            <input value={datesLabel} disabled readOnly />
          </div>
        </div>
        <div className="field">
          <label htmlFor="summary" className="mono">
            Short description shown on invitations
          </label>
          <textarea id="summary" name="summary" rows={3} defaultValue={defaults.summary} />
        </div>
      </div>

      <div className="card stack">
        <h2 className="display-sm">Delivery rules</h2>

        <div className="row row--between">
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Attendance self-marking</div>
            <div className="muted" style={{ fontSize: 14 }}>
              Minutes of playback before a participant can mark themselves present.
            </div>
          </div>
          <div className="stepper">
            <button type="button" onClick={() => setMinutes((m) => Math.max(0, m - 1))} aria-label="Fewer minutes">
              −
            </button>
            <output>{minutes}</output>
            <button type="button" onClick={() => setMinutes((m) => Math.min(240, m + 1))} aria-label="More minutes">
              +
            </button>
            <span className="mono" style={{ marginLeft: 6 }}>
              min
            </span>
          </div>
          <input type="hidden" name="attendanceUnlockMinutes" value={minutes} />
        </div>

        <div className="divider" />

        <div className="row row--between">
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Current week</div>
            <div className="muted" style={{ fontSize: 14 }}>
              Released so far — derived from each week’s calendar date.
            </div>
          </div>
          <div className="mono" style={{ fontSize: 14 }}>
            {currentWeek} of {weekCount}
          </div>
        </div>

        <div className="divider" />

        <div className="row row--between">
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Soft deadlines</div>
            <div className="muted" style={{ fontSize: 14 }}>
              Late work accepted and flagged. Locking is not offered by design.
            </div>
          </div>
          <span className="switch" aria-checked="true" role="switch" aria-disabled="true">
            <i />
          </span>
        </div>
      </div>

      {state?.error && <p style={{ color: 'var(--coral)', fontSize: 14 }}>{state.error}</p>}

      <div className="row" style={{ gap: 'var(--s3)' }}>
        <button type="submit" disabled={pending} className="btn btn--primary">
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        {state?.saved && <span className="mono" style={{ color: 'var(--pine)' }}>Saved ✓</span>}
      </div>
    </form>
  );
}
