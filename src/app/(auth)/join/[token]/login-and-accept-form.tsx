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
    <form action={action} className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">You&apos;re invited</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Join <strong>{title}</strong>. You already have a NetSifr account for{' '}
          <span className="font-mono text-xs">{email}</span> — log in to accept.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Joining…' : 'Log in & accept'}
      </button>
    </form>
  );
}
