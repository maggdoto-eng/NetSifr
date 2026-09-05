import Link from 'next/link';
import { getDefaultOrganization } from '@/lib/org';
import { getEventsForOrg } from '@/modules/events';
import { NewEventForm } from './new-event-form';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  LIVE: 'bg-emerald-200 text-emerald-900',
  COMPLETED: 'bg-zinc-800 text-zinc-100',
  CANCELLED: 'bg-red-200 text-red-900',
};

export default async function EventsPage() {
  const org = await getDefaultOrganization();
  const events = await getEventsForOrg(org.id);

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600">
          Self-service, discoverable activities — unlike Programs, anyone can register from Discover
          without an invite.
        </p>
      </div>

      <NewEventForm />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/admin/events/${event.id}`}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 hover:border-zinc-400"
          >
            <h3 className="font-semibold leading-tight">{event.title}</h3>
            <p className="line-clamp-2 text-sm text-zinc-600">{event.description}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {event.occurrences.length === 0 && (
                <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
                  NO OCCURRENCES YET
                </span>
              )}
              {event.occurrences.map((occ) => (
                <span
                  key={occ.id}
                  className={`rounded px-2 py-0.5 font-mono text-[10px] tracking-wide ${STATUS_STYLES[occ.status]}`}
                >
                  {occ.status}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {events.length === 0 && (
        <p className="rounded border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          No events yet — create the first one above.
        </p>
      )}
    </div>
  );
}
