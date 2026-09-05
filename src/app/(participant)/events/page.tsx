import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getMyEvents } from '@/modules/events';
import { BottomNav } from '../bottom-nav';

export default async function MyEventsPage() {
  const { userId } = await verifySession();
  const events = await getMyEvents(userId);

  return (
    <>
      <header className="ns-hero px-[22px] pb-6 pt-7">
        <div className="ns-label text-mint">Attend</div>
        <h1 className="mt-1.5 text-[28px] leading-none text-cream">My events</h1>
        <p className="mt-2 text-[13px] text-[rgba(245,242,234,0.72)]">
          Everything you&apos;ve registered for or attended.
        </p>
      </header>
      <div className="flex flex-col gap-6 p-[22px]">
        <div className="flex flex-col gap-3">
          {events.map((e) => (
            <Link
              key={e.registrationId}
              href={`/discover/events/${e.occurrenceId}`}
              className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <div className="font-bold leading-tight">{e.eventTitle}</div>
              <div className="font-mono text-[10px] tracking-wide text-zinc-500">
                {e.startsAt.toLocaleString()}
              </div>
              <div className="flex gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    e.status === 'REGISTERED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {e.status === 'REGISTERED' ? 'Registered' : 'Waitlisted'}
                </span>
                {e.checkedIn && (
                  <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white">
                    Attended
                  </span>
                )}
              </div>
            </Link>
          ))}
          {events.length === 0 && (
            <p className="rounded-xl border-2 border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500">
              Nothing yet — browse{' '}
              <Link href="/discover" className="underline">
                Discover
              </Link>{' '}
              to register for an event.
            </p>
          )}
        </div>
      </div>
      <BottomNav active="/events" />
    </>
  );
}
