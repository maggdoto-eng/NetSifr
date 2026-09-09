import Link from 'next/link';
import { getDefaultOrganization } from '@/lib/org';
import { getEventsForOrg } from '@/modules/events';
import { AdminTopbar } from '../admin-topbar';
import { NewEventForm } from './new-event-form';

const STATUS_PILL: Record<string, string> = {
  DRAFT: 'pill pill--draft',
  LIVE: 'pill pill--live',
  COMPLETED: 'pill pill--archived',
  CANCELLED: 'pill pill--due',
};

export default async function EventsPage() {
  const org = await getDefaultOrganization();
  const events = await getEventsForOrg(org.id);

  return (
    <>
      <AdminTopbar trail={[{ label: 'Events' }]} />
      <div className="a-main stack">
        <div>
          <h1 className="display-lg">Events</h1>
          <p className="lede" style={{ marginTop: 8 }}>
            Self-service, discoverable activities — unlike Programs, anyone can register from
            Discover without an invite.
          </p>
        </div>

        <NewEventForm />

        {events.length === 0 ? (
          <div className="empty">No events yet — create the first one above.</div>
        ) : (
          <div className="prog-grid">
            {events.map((event) => (
              <Link key={event.id} href={`/admin/events/${event.id}`} className="card card--pick col" style={{ gap: 'var(--s3)' }}>
                <h3 className="display-sm">{event.title}</h3>
                <p className="muted truncate" style={{ fontSize: 14 }}>
                  {event.description}
                </p>
                <div className="row wrap" style={{ gap: 'var(--s2)' }}>
                  {event.occurrences.length === 0 && <span className="pill">No occurrences yet</span>}
                  {event.occurrences.map((occ) => (
                    <span key={occ.id} className={STATUS_PILL[occ.status]}>
                      {occ.status}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
