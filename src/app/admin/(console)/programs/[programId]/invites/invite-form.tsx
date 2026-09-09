'use client';

import { useActionState, useState } from 'react';
import { generateInviteAction } from './actions';

export function InviteForm({
  cohortId,
  cohortLabel,
  isDraft,
}: {
  cohortId: string;
  cohortLabel: string;
  isDraft: boolean;
}) {
  const [state, action, pending] = useActionState(
    generateInviteAction.bind(null, cohortId),
    undefined,
  );
  const [copied, setCopied] = useState(false);

  return (
    <div className="stack">
      <div>
        <h1 className="display-lg">Enrol into {cohortLabel}</h1>
        <p className="lede" style={{ marginTop: 8 }}>
          Invites are scoped to this program. Someone already on the platform is simply added to
          this cohort — they do not go through account setup again.
        </p>
      </div>

      {isDraft && (
        <div className="card card--notice">
          <strong>This program is still a draft.</strong> You can invite and enrol people now —
          they’ll see their place held, and the sessions open the moment you publish.
        </div>
      )}

      <form action={action} className="stack">
        <div className="field">
          <label htmlFor="email" className="mono">
            Email or phone
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="name@example.org"
            onChange={() => setCopied(false)}
          />
        </div>
        {state?.error && <p style={{ color: 'var(--coral)', fontSize: 14 }}>{state.error}</p>}
        <button type="submit" disabled={pending} className="btn btn--primary self-start">
          {pending ? 'Generating…' : 'Generate invite link'}
        </button>
      </form>

      {state?.url && (
        <div className="card card--dark stack" style={{ gap: 'var(--s2)' }}>
          <div className="mono mono--onDark">Link ready · expires in 14 days</div>
          <div className="figure" style={{ fontSize: 13, wordBreak: 'break-all' }}>
            {state.url}
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(state.url!);
              setCopied(true);
            }}
            className="btn btn--done btn--sm self-start"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}
