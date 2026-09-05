import { getFeedbackForOccurrence } from '@/modules/events';
import { requireAdminContext } from '@/app/admin/action-context';

export default async function FeedbackPage({
  params,
}: PageProps<'/admin/events/[eventId]/occurrences/[occurrenceId]/feedback'>) {
  const { occurrenceId } = await params;
  const { organizationId } = await requireAdminContext();
  const { feedback, averageRating } = await getFeedbackForOccurrence(occurrenceId, organizationId);

  return (
    <div className="flex flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Feedback</h2>
        <div className="rounded-lg bg-zinc-50 px-4 py-2 text-sm">
          <span className="font-mono text-lg font-semibold">
            {averageRating == null ? '—' : averageRating.toFixed(1)}
          </span>
          <span className="ml-1 text-zinc-500">/ 5 average · {feedback.length} responses</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {feedback.map((f) => (
          <div key={f.id} className="rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{f.user.name}</span>
              <span className="font-mono text-xs text-zinc-500">{'★'.repeat(f.rating)}</span>
            </div>
            {f.comment && <p className="mt-2 text-sm text-zinc-700">{f.comment}</p>}
          </div>
        ))}
        {feedback.length === 0 && (
          <p className="rounded border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No feedback submitted yet.
          </p>
        )}
      </div>
    </div>
  );
}
