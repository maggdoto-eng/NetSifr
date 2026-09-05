'use client';

import { useActionState } from 'react';
import { registerAction, cancelRegistrationAction } from './actions';

export function RegisterButton({
  occurrenceId,
  status,
}: {
  occurrenceId: string;
  status: 'REGISTERED' | 'WAITLISTED' | null;
}) {
  const [state, formAction, pending] = useActionState(
    async () => registerAction(occurrenceId),
    undefined,
  );

  if (status) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className={`rounded-xl p-3 text-center text-sm font-semibold ${
            status === 'REGISTERED'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {status === 'REGISTERED' ? "You're registered" : "You're on the waitlist"}
        </div>
        <form action={cancelRegistrationAction.bind(null, occurrenceId)}>
          <button
            type="submit"
            className="w-full rounded-xl border border-zinc-300 py-3 font-semibold"
          >
            Cancel registration
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction}>
      {state?.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-40"
      >
        {pending ? 'Registering…' : 'Register'}
      </button>
    </form>
  );
}
