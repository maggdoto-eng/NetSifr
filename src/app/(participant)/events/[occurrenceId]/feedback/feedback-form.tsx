'use client';

import { useActionState, useState } from 'react';
import { submitFeedbackAction } from './actions';

export function FeedbackForm({
  occurrenceId,
  existingRating,
  existingComment,
}: {
  occurrenceId: string;
  existingRating?: number;
  existingComment?: string | null;
}) {
  const [rating, setRating] = useState(existingRating ?? 0);
  const [state, action, pending] = useActionState(
    submitFeedbackAction.bind(null, occurrenceId),
    undefined,
  );

  if (state?.success) {
    return (
      <div className="rounded-xl bg-emerald-100 p-4 text-center text-sm font-semibold text-emerald-800">
        Thanks for the feedback!
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="rating" value={rating} />
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            className={`text-3xl ${n <= rating ? 'text-orange-500' : 'text-zinc-200'}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        name="comment"
        defaultValue={existingComment ?? ''}
        rows={3}
        placeholder="Anything you'd like to share? (optional)"
        className="rounded-xl border border-zinc-300 p-3 text-sm"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={rating === 0 || pending}
        className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-40"
      >
        {pending ? 'Submitting…' : 'Submit feedback'}
      </button>
    </form>
  );
}
