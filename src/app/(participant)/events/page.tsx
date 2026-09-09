import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getMyEvents } from '@/modules/events';

export default async function MyEventsPage() {
  const { userId } = await verifySession();
  const events = await getMyEvents(userId);

  return (
    <div className="shell stack">
      <div>
        <div className="mono">Attend</div>
        <h1 className="display-lg" style={{ marginTop: 6 }}>
          My events
        </h1>
        <p className="lede" style={{ marginTop: 8 }}>
          Everything you’ve registered for or attended.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="empty">
          Nothing yet — browse <Link href="/discover">Discover</Link> to register for an event.
        </div>
      ) : (
        <div className="grid-3">
          {events.map((e) => (
            <Link key={e.registrationId} href={`/discover/events/${e.occurrenceId}`} className="card card--pick col" style={{ gap: 'var(--s3)' }}>
              <div className="title">{e.eventTitle}</div>
              <div className="mono">{e.startsAt.toLocaleString()}</div>
              <div className="row" style={{ gap: 'var(--s2)' }}>
                <span className={e.status === 'REGISTERED' ? 'pill pill--done' : 'pill pill--late'}>
                  {e.status === 'REGISTERED' ? 'Registered' : 'Waitlisted'}
                </span>
                {e.checkedIn && <span className="pill pill--live">Attended</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
