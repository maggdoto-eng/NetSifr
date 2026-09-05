'use client';

import { useTransition } from 'react';
import { signUpAction, cancelSignupAction } from './actions';

export function ShiftSignup({
  opportunityId,
  shiftId,
  signupId,
  full,
}: {
  opportunityId: string;
  shiftId: string;
  signupId: string | null;
  full: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (signupId) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            void cancelSignupAction(opportunityId, signupId);
          })
        }
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
      >
        {pending ? '…' : 'Cancel'}
      </button>
    );
  }

  if (full) {
    return <span className="text-xs font-medium text-zinc-400">Full</span>;
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          void signUpAction(opportunityId, shiftId);
        })
      }
      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
    >
      {pending ? '…' : 'Sign up'}
    </button>
  );
}
