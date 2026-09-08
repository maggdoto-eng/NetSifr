'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { adminLoginAction } from '@/app/(auth)/actions';

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(adminLoginAction, undefined);

  return (
    <div
      className="contour"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--s7) var(--s5)',
        background: 'var(--pine-deep)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div
          className="col"
          style={{ alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s6)' }}
        >
          <div
            className="a-rail__brand"
            style={{ color: 'var(--fg-on-dark)', fontSize: 24, justifyContent: 'center' }}
          >
            NetSifr <span className="tag">Admin</span>
          </div>
          <div className="mono" style={{ color: 'var(--on-dark-faint)' }}>
            Staff &amp; coordinator access
          </div>
        </div>

        <form
          action={action}
          className="stack card"
          style={{ padding: 'var(--s6)', boxShadow: 'var(--shadow-float)' }}
        >
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

          <button type="submit" disabled={pending} className="btn btn--accent btn--block">
            {pending ? 'Signing in…' : 'Sign in to console'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--s5)' }}>
          <Link href="/login" className="mono" style={{ color: 'var(--on-dark-faint)' }}>
            ← Participant login
          </Link>
        </div>
      </div>
    </div>
  );
}
