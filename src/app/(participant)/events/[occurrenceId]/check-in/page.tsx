import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getOccurrenceDetail } from '@/modules/events';
import { CheckInButton } from './check-in-button';

export default async function EventCheckInPage({
  params,
  searchParams,
}: PageProps<'/events/[occurrenceId]/check-in'>) {
  const { occurrenceId } = await params;
  const search = await searchParams;
  const token = typeof search.token === 'string' ? search.token : undefined;
  // Gate the page on a session, but never mutate during this GET render —
  // the actual check-in happens only when the participant presses the button
  // (see check-in/actions.ts).
  await verifySession();
  const occurrence = await getOccurrenceDetail(occurrenceId);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6">
      <CheckInButton
        occurrenceId={occurrenceId}
        eventTitle={occurrence.event.title}
        token={token}
      />
      <Link href="/events" className="text-xs text-zinc-500 underline">
        My events
      </Link>
    </div>
  );
}
