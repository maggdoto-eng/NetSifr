'use client';

import { useActionState } from 'react';
import { signupAndAcceptAction } from './actions';

export function SignupAndAcceptForm({
  token,
  email,
  title,
}: {
  token: string;
  email: string;
  title: string;
}) {
  const [state, action, pending] = useActionState(
    signupAndAcceptAction.bind(null, token),
    undefined,
  );

  return (
    <form action={action} className="stack">
      <div>
        <h1 className="display-sm">You’re invited</h1>
        <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>
          Join <strong>{title}</strong> as <span className="mono">{email}</span>. Set up your
          NetSifr account once — it carries across every program you join.
        </p>
      </div>

      <div className="field">
        <label htmlFor="name" className="mono">
          Your name
        </label>
        <input id="name" name="name" required />
      </div>

      <div className="field">
        <label htmlFor="password" className="mono">
          Choose a password
        </label>
        <input id="password" name="password" type="password" required autoComplete="new-password" />
      </div>

      {state?.error && (
        <p style={{ color: 'var(--coral)', fontSize: 14 }} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn--accent btn--block">
        {pending ? 'Joining…' : 'Accept & join'}
      </button>
    </form>
  );
}
