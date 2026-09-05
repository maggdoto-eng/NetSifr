'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { applyAction, withdrawAction } from './actions';
import type { VolunteerApplicationStatus } from '@/generated/prisma/client';

export function ApplyButton({
  opportunityId,
  status,
}: {
  opportunityId: string;
  status: VolunteerApplicationStatus | null;
}) {
  const [state, action, pending] = useActionState(applyAction.bind(null, opportunityId), undefined);

  const active = status === 'APPLIED' || status === 'SHORTLISTED' || status === 'ACCEPTED';

  if (state?.applied || active) {
    const effective = state?.applied ? 'APPLIED' : status;
    return (
      <div className="flex flex-col gap-2">
        <div
          className={`rounded-xl p-3 text-center text-sm font-semibold ${
            effective === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
          }`}
        >
          {effective === 'ACCEPTED'
            ? "You're accepted — pick shifts and log your hours"
            : effective === 'SHORTLISTED'
              ? "You're shortlisted"
              : 'Application submitted'}
        </div>
        {effective === 'ACCEPTED' ? (
          <Link
            href={`/volunteering/${opportunityId}`}
            className="w-full rounded-xl bg-orange-500 py-3 text-center font-semibold text-white"
          >
            Go to your volunteering
          </Link>
        ) : (
          <form action={withdrawAction.bind(null, opportunityId)}>
            <button
              type="submit"
              className="w-full rounded-xl border border-zinc-300 py-3 font-semibold"
            >
              Withdraw application
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <textarea
        name="message"
        rows={3}
        placeholder="Why you'd like to help (optional)"
        className="rounded-xl border border-zinc-300 p-3 text-sm"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-40"
      >
        {pending ? 'Submitting…' : 'Apply to volunteer'}
      </button>
    </form>
  );
}
