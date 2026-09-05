'use client';

import { useActionState, useState } from 'react';
import { generateInviteAction } from './actions';

export function InviteForm({ cohortId }: { cohortId: string }) {
  const [state, action, pending] = useActionState(
    generateInviteAction.bind(null, cohortId),
    undefined,
  );
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex w-96 flex-none flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Invite to this program</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Invites are scoped to this program. Someone already on the platform is simply added to
          this cohort — they don&apos;t onboard again.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-2">
        <label className="font-mono text-[10px] text-zinc-500">EMAIL</label>
        <input
          name="email"
          type="email"
          required
          placeholder="name@example.org"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          onClick={() => setCopied(false)}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Generating…' : 'Generate invite link'}
        </button>
      </form>

      {state?.url && (
        <div className="flex flex-col gap-2 rounded-lg bg-zinc-900 p-4 text-zinc-50">
          <div className="font-mono text-[10px] tracking-wide text-emerald-300">
            LINK READY · EXPIRES IN 14 DAYS
          </div>
          <div className="break-all font-mono text-xs">{state.url}</div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(state.url!);
              setCopied(true);
            }}
            className="rounded bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-900"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}
