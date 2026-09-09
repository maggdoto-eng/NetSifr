import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getDefaultOrganization } from '@/lib/org';
import { getDiscoverFeed } from '@/modules/events';
import { getVolunteerDiscoverCards } from '@/modules/volunteering';

const LOCATION_LABEL: Record<string, string> = {
  ONLINE: 'Online',
  PHYSICAL: 'In person',
  HYBRID: 'Hybrid',
};

export default async function DiscoverPage() {
  const { userId } = await verifySession();
  const org = await getDefaultOrganization();
  const [{ events, courses }, volunteering] = await Promise.all([
    getDiscoverFeed(org.id, userId),
    getVolunteerDiscoverCards(org.id, userId),
  ]);

  return (
    <div className="shell stack">
      <div>
        <div className="mono">Explore</div>
        <h1 className="display-lg" style={{ marginTop: 6 }}>
          Discover
        </h1>
        <p className="lede" style={{ marginTop: 8 }}>
          Events and volunteer calls are open to everyone. Programs are invite-only — your
          facilitator adds you.
        </p>
      </div>

      <div className="stack">
        <div className="mono mono--coral">Events</div>
        {events.length === 0 ? (
          <div className="empty">No events open right now — check back soon.</div>
        ) : (
          <div className="grid-3">
            {events.map((e) => (
              <Link key={e.occurrenceId} href={`/discover/events/${e.occurrenceId}`} className="card card--pick col" style={{ gap: 'var(--s3)' }}>
                <div className="title">{e.eventTitle}</div>
                <div className="mono">
                  {e.startsAt.toLocaleString()} · {LOCATION_LABEL[e.locationMode]}
                </div>
                <div className="row row--between">
                  <span className="muted" style={{ fontSize: 13 }}>
                    {e.registeredCount}
                    {e.capacity != null && ` / ${e.capacity}`} registered
                  </span>
                  {e.myRegistrationStatus === 'REGISTERED' ? (
                    <span className="pill pill--done">Registered</span>
                  ) : e.myRegistrationStatus === 'WAITLISTED' ? (
                    <span className="pill pill--late">Waitlisted</span>
                  ) : (
                    <span className="pill pill--due">Register</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="stack">
        <div className="mono mono--coral">Volunteer</div>
        {volunteering.length === 0 ? (
          <div className="empty">No volunteer calls open right now — check back soon.</div>
        ) : (
          <div className="grid-3">
            {volunteering.map((v) => (
              <Link key={v.volunteerOpportunityId} href={`/discover/volunteering/${v.volunteerOpportunityId}`} className="card card--pick col" style={{ gap: 'var(--s3)' }}>
                <div className="title">{v.title}</div>
                <div className="mono">
                  {LOCATION_LABEL[v.locationMode]}
                  {v.applyByDate && ` · apply by ${v.applyByDate.toLocaleDateString()}`}
                </div>
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  {v.myApplicationStatus === 'ACCEPTED' ? (
                    <span className="pill pill--done">Accepted</span>
                  ) : v.myApplicationStatus === 'APPLIED' || v.myApplicationStatus === 'SHORTLISTED' ? (
                    <span className="pill pill--live">Applied</span>
                  ) : (
                    <span className="pill pill--due">Apply</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="stack">
        <div className="mono">Programs · invite-only</div>
        {courses.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            No live programs right now.
          </p>
        ) : (
          <div className="grid-3">
            {courses.map((c) => (
              <div key={c.cohortId} className="card card--sunk col" style={{ gap: 4 }}>
                <div className="title">{c.title}</div>
                <div className="mono">{c.cohortLabel} · ask your facilitator for an invite</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
