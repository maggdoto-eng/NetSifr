'use client';

import { useActionState, useState } from 'react';
import { createOccurrenceAction } from './actions';

export function NewOccurrenceForm({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    createOccurrenceAction.bind(null, eventId),
    undefined,
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        + New occurrence
      </button>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-lg border-2 border-zinc-900 bg-zinc-50 p-5"
    >
      <h2 className="text-lg font-semibold">New occurrence</h2>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="startsAt" className="font-mono text-xs text-zinc-500">
            STARTS
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="endsAt" className="font-mono text-xs text-zinc-500">
            ENDS
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            required
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="locationMode" className="font-mono text-xs text-zinc-500">
            LOCATION
          </label>
          <select
            id="locationMode"
            name="locationMode"
            defaultValue="ONLINE"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="ONLINE">Online</option>
            <option value="PHYSICAL">In person</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>
        <div className="flex w-36 flex-col gap-1">
          <label htmlFor="capacity" className="font-mono text-xs text-zinc-500">
            CAPACITY (OPTIONAL)
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            placeholder="Unlimited"
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
          {pending ? 'Creating…' : 'Create occurrence'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500">
          Cancel
        </button>
        <p className="text-xs text-zinc-500">
          Starts as a draft — publish it to make it registerable from Discover.
        </p>
      </div>
    </form>
  );
}
