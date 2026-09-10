'use client';

import { useActionState, useEffect, useRef } from 'react';
import { communityPostAction } from '../community-actions';

export function NewCommunityPost() {
  const [state, action, pending] = useActionState(communityPostAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state?.ok]);
  return (
    <form ref={ref} action={action} className="card stack" style={{ gap: 'var(--s3)' }}>
      <textarea name="body" required rows={3} placeholder="Share something with the whole community…" />
      {state?.error && <p style={{ color: 'var(--coral)', fontSize: 14 }}>{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn--primary self-start">
        {pending ? 'Posting…' : 'Post to community'}
      </button>
    </form>
  );
}
