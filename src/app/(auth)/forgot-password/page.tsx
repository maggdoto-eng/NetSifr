'use client';

import { useActionState } from 'react';
import { requestPasswordResetAction } from '../actions';

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, undefined);

  if (state?.success) {
    return (
      <p className="text-sm">
        If an account exists for that email, a reset link is on its way. It expires in 1 hour.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Reset your password</h1>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}
