'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction } from '../actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="stack">
      <div className="col" style={{ gap: 'var(--s1)' }}>
        <h1 className="display-sm">Log in</h1>
        <p className="muted" style={{ fontSize: 14 }}>
          Welcome back. Continue to your programs.
        </p>
      </div>

      <div className="field">
        <label htmlFor="email" className="mono">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" />
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
        {pending ? 'Logging in…' : 'Log in'}
      </button>

      <div className="col" style={{ gap: 'var(--s2)', alignItems: 'center', textAlign: 'center' }}>
        <Link href="/forgot-password" style={{ fontSize: 14 }}>
          Forgot your password?
        </Link>
        <div className="muted" style={{ fontSize: 14 }}>
          New to NetSifr?{' '}
          <Link href="/register">Join with an invite</Link>
        </div>
      </div>

      <div className="divider" />

      <Link
        href="/admin/login"
        className="mono"
        style={{ textAlign: 'center', color: 'var(--mute)' }}
      >
        Staff &amp; admin login →
      </Link>
    </form>
  );
}
