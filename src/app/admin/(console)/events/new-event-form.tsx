'use client';

import { useActionState, useState } from 'react';
import { createEventAction } from './actions';

export function NewEventForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createEventAction, undefined);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        + New event
      </button>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-lg border-2 border-zinc-900 bg-zinc-50 p-5"
    >
      <h2 className="text-lg font-semibold">New event</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="font-mono text-xs text-zinc-500">
          TITLE
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="e.g. Monthly Climate Cafe"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="font-mono text-xs text-zinc-500">
          DESCRIPTION (OPTIONAL)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create event'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500">
          Cancel
        </button>
        <p className="text-xs text-zinc-500">
          An Event is the reusable series — add one or more scheduled occurrences next.
        </p>
      </div>
    </form>
  );
}
