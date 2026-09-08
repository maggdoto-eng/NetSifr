'use client';

import { useActionState, useState } from 'react';
import { createVolunteerOpportunityAction } from './actions';

export function NewOpportunityForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createVolunteerOpportunityAction, undefined);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        + New opportunity
      </button>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-lg border-2 border-zinc-900 bg-zinc-50 p-5"
    >
      <h2 className="text-lg font-semibold">New volunteer opportunity</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="font-mono text-xs text-zinc-500">
          TITLE
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="e.g. Shoreline Cleanup Crew"
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
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="locationMode" className="font-mono text-xs text-zinc-500">
            LOCATION
          </label>
          <select
            id="locationMode"
            name="locationMode"
            defaultValue="PHYSICAL"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="ONLINE">Online</option>
            <option value="PHYSICAL">In person</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="applyByDate" className="font-mono text-xs text-zinc-500">
            APPLY BY (OPTIONAL)
          </label>
          <input
            id="applyByDate"
            name="applyByDate"
            type="date"
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
          {pending ? 'Creating…' : 'Create opportunity'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500">
          Cancel
        </button>
        <p className="text-xs text-zinc-500">
          Starts as a draft — open it to make it discoverable and accept applications.
        </p>
      </div>
    </form>
  );
}
