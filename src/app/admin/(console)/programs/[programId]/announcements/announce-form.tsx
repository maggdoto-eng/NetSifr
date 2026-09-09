'use client';

import { useActionState, useRef, useEffect } from 'react';
import { postAnnouncementAction } from './actions';

export function AnnounceForm({ cohortId }: { cohortId: string }) {
  const [state, action, pending] = useActionState(
    postAnnouncementAction.bind(null, cohortId),
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.posted) formRef.current?.reset();
  }, [state?.posted]);

  return (
    <form ref={formRef} action={action} className="card stack">
      <h2 className="display-sm">New announcement</h2>
      <div className="field">
        <label htmlFor="title" className="mono">
          Title
        </label>
        <input id="title" name="title" required placeholder="e.g. Week 3 recording is up" />
      </div>
      <div className="field">
        <label htmlFor="body" className="mono">
          Message
        </label>
        <textarea id="body" name="body" required rows={4} placeholder="Write to your cohort…" />
      </div>
      {state?.error && <p style={{ color: 'var(--coral)', fontSize: 14 }}>{state.error}</p>}
      <div className="row" style={{ gap: 'var(--s3)' }}>
        <button type="submit" disabled={pending} className="btn btn--primary">
          {pending ? 'Posting…' : 'Post to cohort'}
        </button>
        {state?.posted && (
          <span className="mono" style={{ color: 'var(--pine)' }}>
            Posted ✓ everyone was notified
          </span>
        )}
      </div>
    </form>
  );
}
