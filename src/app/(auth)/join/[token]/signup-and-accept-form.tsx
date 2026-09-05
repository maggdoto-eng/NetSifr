'use client';

import { useActionState } from 'react';
import { signupAndAcceptAction } from './actions';

export function SignupAndAcceptForm({
  token,
  email,
  title,
}: {
  token: string;
  email: string;
  title: string;
}) {
  const [state, action, pending] = useActionState(
    signupAndAcceptAction.bind(null, token),
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">You&apos;re invited</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Join <strong>{title}</strong> as <span className="font-mono text-xs">{email}</span>. Set
          up your NetSifr account once — it carries across every program you join.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Your name
        </label>
        <input
          id="name"
          name="name"
          required
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Choose a password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Joining…' : 'Accept & join'}
      </button>
    </form>
  );
}
