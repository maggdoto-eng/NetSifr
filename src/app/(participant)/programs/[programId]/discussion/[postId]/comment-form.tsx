'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addCommentAction } from '../actions';

export function CommentForm({ cohortId, postId }: { cohortId: string; postId: string }) {
  const [state, action, pending] = useActionState(
    addCommentAction.bind(null, cohortId, postId),
    undefined,
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={ref} action={action} className="stack" style={{ gap: 'var(--s2)' }}>
      <textarea name="body" required rows={2} placeholder="Write a reply…" />
      {state?.error && <p style={{ color: 'var(--coral)', fontSize: 14 }}>{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn--primary btn--sm self-start">
        {pending ? 'Replying…' : 'Reply'}
      </button>
    </form>
  );
}
