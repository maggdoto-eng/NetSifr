'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createPostAction } from './actions';

export function NewPostForm({ cohortId }: { cohortId: string }) {
  const [state, action, pending] = useActionState(createPostAction.bind(null, cohortId), undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={ref} action={action} className="card stack" style={{ gap: 'var(--s3)' }}>
      <textarea name="body" required rows={3} placeholder="Start a discussion with your cohort…" />
      {state?.error && <p style={{ color: 'var(--coral)', fontSize: 14 }}>{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn--primary self-start">
        {pending ? 'Posting…' : 'Post'}
      </button>
    </form>
  );
}
