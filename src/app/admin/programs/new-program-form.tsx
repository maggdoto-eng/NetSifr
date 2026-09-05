'use client';

import { useActionState, useState } from 'react';
import { createProgramAction } from './actions';

export function NewProgramForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createProgramAction, undefined);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        + New program
      </button>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-lg border-2 border-zinc-900 bg-zinc-50 p-5"
    >
      <h2 className="text-lg font-semibold">New program</h2>

      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-64 flex-2 flex-col gap-1">
          <label htmlFor="title" className="font-mono text-xs text-zinc-500">
            TITLE
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="e.g. Heat Resilience for Informal Workers"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <label htmlFor="cohortLabel" className="font-mono text-xs text-zinc-500">
            COHORT LABEL
          </label>
          <input
            id="cohortLabel"
            name="cohortLabel"
            required
            defaultValue="Cohort 1"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex w-32 flex-col gap-1">
          <label htmlFor="weekCount" className="font-mono text-xs text-zinc-500">
            WEEKS
          </label>
          <input
            id="weekCount"
            name="weekCount"
            type="number"
            min={1}
            max={20}
            required
            defaultValue={6}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create program'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500">
          Cancel
        </button>
        <p className="text-xs text-zinc-500">
          Creates the given number of empty weeks, each pre-seeded with a recording + reading slot.
          Starts as a draft — invisible to participants until published.
        </p>
      </div>
    </form>
  );
}
