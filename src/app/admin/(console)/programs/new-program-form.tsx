'use client';

import { useActionState, useState } from 'react';
import { createProgramAction } from './actions';

export function NewProgramForm() {
  const [open, setOpen] = useState(false);
  const [weeks, setWeeks] = useState(6);
  const [state, action, pending] = useActionState(createProgramAction, undefined);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn--primary self-start">
        + New program
      </button>
    );
  }

  return (
    <form action={action} className="card card--sel stack">
      <h2 className="display-sm">New program</h2>

      <div className="row wrap row--top" style={{ gap: 'var(--s4)' }}>
        <div className="field grow" style={{ minWidth: 260 }}>
          <label htmlFor="title" className="mono">
            Title
          </label>
          <input id="title" name="title" required placeholder="e.g. Heat Resilience for Informal Workers" />
        </div>
        <div className="field" style={{ minWidth: 180 }}>
          <label htmlFor="cohortLabel" className="mono">
            Cohort label
          </label>
          <input id="cohortLabel" name="cohortLabel" required defaultValue="Cohort 1" />
        </div>
        <div className="field">
          <label className="mono">Weeks</label>
          <div className="stepper" style={{ height: 44 }}>
            <button
              type="button"
              onClick={() => setWeeks((w) => Math.max(1, w - 1))}
              aria-label="Fewer weeks"
            >
              −
            </button>
            <output>{weeks}</output>
            <button
              type="button"
              onClick={() => setWeeks((w) => Math.min(20, w + 1))}
              aria-label="More weeks"
            >
              +
            </button>
            <input type="hidden" name="weekCount" value={weeks} />
          </div>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 14 }}>
        Creates {weeks} empty weeks, each with an unpublished recording and reading slot. Starts as a
        draft: you can enrol a cohort ahead of launch, but nobody can open the sessions until you
        publish it.
      </p>

      {state?.error && <p style={{ color: 'var(--coral)', fontSize: 14 }}>{state.error}</p>}

      <div className="row" style={{ gap: 'var(--s2)' }}>
        <button type="submit" disabled={pending} className="btn btn--primary">
          {pending ? 'Creating…' : 'Create program'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn--ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
