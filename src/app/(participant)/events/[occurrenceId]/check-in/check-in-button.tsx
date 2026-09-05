'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { checkInAction, type CheckInState } from './actions';

const INITIAL: CheckInState = { status: 'idle' };

export function CheckInButton({
  occurrenceId,
  eventTitle,
  token,
}: {
  occurrenceId: string;
  eventTitle: string;
  token?: string;
}) {
  const [state, action, pending] = useActionState(checkInAction.bind(null, token ?? ''), INITIAL);

  if (state.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <h1 className="text-xl font-bold">You&apos;re checked in!</h1>
        <p className="text-sm text-zinc-600">Enjoy the event — 150 points are on their way.</p>
        <Link
          href={`/events/${occurrenceId}/feedback`}
          className="mt-2 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white"
        >
          Leave feedback
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-2xl text-orange-600">
        ◎
      </div>
      <h1 className="text-xl font-bold">Check in to {eventTitle}</h1>
      <p className="text-sm text-zinc-600">Confirm you&apos;re here to record your attendance.</p>
      {state.status === 'error' && <p className="text-sm text-red-600">{state.message}</p>}
      <form action={action} className="w-full">
        <button
          type="submit"
          disabled={pending || !token}
          className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-40"
        >
          {pending ? 'Checking in…' : 'Check in'}
        </button>
      </form>
    </div>
  );
}
