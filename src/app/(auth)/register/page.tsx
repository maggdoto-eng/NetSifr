'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * NetSifr is invite-only by design (see docs/plan.md — Phase 1 keeps enrolment
 * invite-gated; there is no public self-signup). This page is the honest front
 * door for that: it explains access is by invitation and lets someone who was
 * sent a link paste it here to continue to the account-setup flow at
 * /join/[token]. It deliberately does not create accounts.
 */
function extractToken(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  // Accept a full invite URL (…/join/<token>) or a bare token.
  const match = value.match(/\/join\/([^/?#\s]+)/);
  if (match) return match[1];
  // A bare token: no slashes/spaces.
  if (!/[\s/]/.test(value)) return value;
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = extractToken(value);
    if (!token) {
      setError('That doesn’t look like a valid invite link. Paste the whole link from your email.');
      return;
    }
    router.push(`/join/${encodeURIComponent(token)}`);
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="col" style={{ gap: 'var(--s1)' }}>
        <h1 className="display-sm">Join NetSifr</h1>
        <p className="muted" style={{ fontSize: 14 }}>
          NetSifr is invite-only. Your facilitator or a programme coordinator sends you an
          invitation link — open it, or paste it below to continue.
        </p>
      </div>

      <div className="card--notice card" style={{ padding: 'var(--s4)' }}>
        <p style={{ fontSize: 14, margin: 0 }}>
          Don’t have an invite yet? Reach out to the team running your programme and they’ll add
          you. Accounts are created when you accept an invitation.
        </p>
      </div>

      <div className="field">
        <label htmlFor="invite" className="mono">
          Invite link or code
        </label>
        <input
          id="invite"
          name="invite"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="https://…/join/…"
          autoComplete="off"
        />
      </div>

      {error && (
        <p style={{ color: 'var(--coral)', fontSize: 14 }} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn--primary btn--block">
        Continue
      </button>

      <div className="muted" style={{ fontSize: 14, textAlign: 'center' }}>
        Already have an account? <Link href="/login">Log in</Link>
      </div>
    </form>
  );
}
