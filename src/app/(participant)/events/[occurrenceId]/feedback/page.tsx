import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getOccurrenceDetail, getUserFeedback } from '@/modules/events';
import { FeedbackForm } from './feedback-form';

export default async function EventFeedbackPage({
  params,
}: PageProps<'/events/[occurrenceId]/feedback'>) {
  const { occurrenceId } = await params;
  const { userId } = await verifySession();

  const [occurrence, feedback] = await Promise.all([
    getOccurrenceDetail(occurrenceId),
    getUserFeedback(userId, occurrenceId),
  ]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 p-6">
      <Link href="/events" className="text-xs text-zinc-500 underline">
        ← My events
      </Link>

      <div>
        <div className="font-mono text-[10px] tracking-wide text-orange-600">FEEDBACK</div>
        <h1 className="mt-1 text-xl font-bold">{occurrence.event.title}</h1>
        <p className="mt-1 text-sm text-zinc-600">How was it? Your rating helps us plan.</p>
      </div>

      <FeedbackForm
        occurrenceId={occurrenceId}
        existingRating={feedback?.rating}
        existingComment={feedback?.comment}
      />
    </div>
  );
}
