import Link from 'next/link';
import { getEventWithOccurrences } from '@/modules/events';
import { requireAdminContext } from '@/app/admin/action-context';
import { NewOccurrenceForm } from './new-occurrence-form';
import {
  publishOccurrenceAction,
  completeOccurrenceAction,
  cancelOccurrenceAction,
} from './actions';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  LIVE: 'bg-emerald-200 text-emerald-900',
  COMPLETED: 'bg-zinc-800 text-zinc-100',
  CANCELLED: 'bg-red-200 text-red-900',
};

const LOCATION_LABEL: Record<string, string> = {
  ONLINE: 'Online',
  PHYSICAL: 'In person',
  HYBRID: 'Hybrid',
};

export default async function EventDetailPage({ params }: PageProps<'/admin/events/[eventId]'>) {
  const { eventId } = await params;
  const { organizationId } = await requireAdminContext();
  const event = await getEventWithOccurrences(eventId, organizationId);

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <Link href="/admin/events" className="text-xs text-zinc-500 underline">
          ← Events
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{event.title}</h1>
        {event.description && (
          <p className="mt-1 max-w-xl text-sm text-zinc-600">{event.description}</p>
        )}
      </div>

      <NewOccurrenceForm eventId={eventId} />

      <div className="flex flex-col gap-3">
        {event.occurrences.map((occ) => (
          <div
            key={occ.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4"
          >
            <div className="flex items-center gap-3">
              <span
                className={`rounded px-2 py-0.5 font-mono text-[10px] tracking-wide ${STATUS_STYLES[occ.status]}`}
              >
                {occ.status}
              </span>
              <div>
                <div className="text-sm font-semibold">
                  {occ.startsAt.toLocaleString()} → {occ.endsAt.toLocaleString()}
                </div>
                <div className="font-mono text-[10px] text-zinc-500">
                  {LOCATION_LABEL[occ.locationMode]}
                  {occ.capacity != null && ` · CAPACITY ${occ.capacity}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/events/${eventId}/occurrences/${occ.id}/registrations`}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm"
              >
                Registrations
              </Link>
              <Link
                href={`/admin/events/${eventId}/occurrences/${occ.id}/check-in`}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm"
              >
                Check-in QR
              </Link>
              <Link
                href={`/admin/events/${eventId}/occurrences/${occ.id}/feedback`}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm"
              >
                Feedback
              </Link>
              {occ.status === 'DRAFT' && (
                <form
                  action={publishOccurrenceAction.bind(null, { eventId, occurrenceId: occ.id })}
                >
                  <button
                    type="submit"
                    className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white"
                  >
                    Publish
                  </button>
                </form>
              )}
              {occ.status === 'LIVE' && (
                <>
                  <form
                    action={completeOccurrenceAction.bind(null, { eventId, occurrenceId: occ.id })}
                  >
                    <button
                      type="submit"
                      className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white"
                    >
                      Mark complete
                    </button>
                  </form>
                  <form
                    action={cancelOccurrenceAction.bind(null, { eventId, occurrenceId: occ.id })}
                  >
                    <button
                      type="submit"
                      className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
                    >
                      Cancel
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        ))}
        {event.occurrences.length === 0 && (
          <p className="rounded border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No occurrences yet — create the first one above.
          </p>
        )}
      </div>
    </div>
  );
}
