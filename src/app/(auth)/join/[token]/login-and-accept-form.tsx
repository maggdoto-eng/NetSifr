'use client';

import { useActionState } from 'react';
import { loginAndAcceptAction } from './actions';

export function LoginAndAcceptForm({
  token,
  email,
  title,
}: {
  token: string;
  email: string;
  title: string;
}) {
  const [state, action, pending] = useActionState(
    loginAndAcceptAction.bind(null, token),
    undefined,
  );

  return (
    <form action={action} className="stack">
      <div>
        <h1 className="display-sm">You’re invited</h1>
        <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>
          Join <strong>{title}</strong>. You already have a NetSifr account for{' '}
          <span className="mono">{email}</span> — log in to accept.
        </p>
      </div>

      <div className="field">
        <label htmlFor="password" className="mono">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      {state?.error && (
        <p style={{ color: 'var(--coral)', fontSize: 14 }} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn--primary btn--block">
        {pending ? 'Joining…' : 'Log in & accept'}
      </button>
    </form>
  );
}
