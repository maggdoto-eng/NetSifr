'use client';

import { useActionState } from 'react';
import { logHoursAction } from './actions';

export function LogHoursForm({
  opportunityId,
  shifts,
}: {
  opportunityId: string;
  shifts: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(
    logHoursAction.bind(null, opportunityId),
    undefined,
  );

  if (state?.logged) {
    return (
      <div className="rounded-xl bg-emerald-100 p-4 text-center text-sm font-semibold text-emerald-800">
        Hours submitted — an organizer will verify them.
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4">
      <div className="text-sm font-semibold">Log your hours</div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="hours" className="font-mono text-[10px] text-zinc-500">
            HOURS
          </label>
          <input
            id="hours"
            name="hours"
            type="number"
            step="0.5"
            min="0.5"
            required
            className="rounded-xl border border-zinc-300 p-2.5 text-sm"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="occurredOn" className="font-mono text-[10px] text-zinc-500">
            DATE
          </label>
          <input
            id="occurredOn"
            name="occurredOn"
            type="date"
            required
            className="rounded-xl border border-zinc-300 p-2.5 text-sm"
          />
        </div>
      </div>
      {shifts.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="shiftId" className="font-mono text-[10px] text-zinc-500">
            SHIFT (OPTIONAL)
          </label>
          <select
            id="shiftId"
            name="shiftId"
            defaultValue=""
            className="rounded-xl border border-zinc-300 p-2.5 text-sm"
          >
            <option value="">Not tied to a shift</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      )}
      <textarea
        name="note"
        rows={2}
        placeholder="What did you do? (optional)"
        className="rounded-xl border border-zinc-300 p-2.5 text-sm"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-orange-500 py-2.5 font-semibold text-white disabled:opacity-40"
      >
        {pending ? 'Submitting…' : 'Submit hours'}
      </button>
    </form>
  );
}
