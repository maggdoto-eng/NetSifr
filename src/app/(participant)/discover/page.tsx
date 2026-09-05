import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getDefaultOrganization } from '@/lib/org';
import { getDiscoverFeed } from '@/modules/events';
import { getVolunteerDiscoverCards } from '@/modules/volunteering';
import { BottomNav } from '../bottom-nav';

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
    <>
      <header className="ns-hero px-[22px] pb-6 pt-7">
        <div className="ns-label text-mint">Explore</div>
        <h1 className="mt-1.5 text-[28px] leading-none text-cream">Discover</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[rgba(245,242,234,0.72)]">
          Events and volunteer calls are open to everyone. Programs are invite-only — your
          facilitator adds you.
        </p>
      </header>
      <div className="flex flex-col gap-6 p-[22px]">
        <div className="flex flex-col gap-3">
          <div className="font-mono text-[10px] tracking-wide text-orange-600">EVENTS</div>
          {events.map((e) => (
            <Link
              key={e.occurrenceId}
              href={`/discover/events/${e.occurrenceId}`}
              className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <div className="font-bold leading-tight">{e.eventTitle}</div>
              <div className="font-mono text-[10px] tracking-wide text-zinc-500">
                {e.startsAt.toLocaleString()} · {LOCATION_LABEL[e.locationMode]}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  {e.registeredCount}
                  {e.capacity != null && ` / ${e.capacity}`} registered
                </span>
                {e.myRegistrationStatus === 'REGISTERED' && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    Registered
                  </span>
                )}
                {e.myRegistrationStatus === 'WAITLISTED' && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    Waitlisted
                  </span>
                )}
                {e.myRegistrationStatus == null && (
                  <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white">
                    Register
                  </span>
                )}
              </div>
            </Link>
          ))}
          {events.length === 0 && (
            <p className="rounded-xl border-2 border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500">
              No events open right now — check back soon.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="font-mono text-[10px] tracking-wide text-orange-600">VOLUNTEER</div>
          {volunteering.map((v) => (
            <Link
              key={v.volunteerOpportunityId}
              href={`/discover/volunteering/${v.volunteerOpportunityId}`}
              className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <div className="font-bold leading-tight">{v.title}</div>
              <div className="font-mono text-[10px] tracking-wide text-zinc-500">
                {LOCATION_LABEL[v.locationMode]}
                {v.applyByDate && ` · APPLY BY ${v.applyByDate.toLocaleDateString()}`}
              </div>
              <div className="flex items-center justify-end">
                {v.myApplicationStatus === 'ACCEPTED' && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    Accepted
                  </span>
                )}
                {(v.myApplicationStatus === 'APPLIED' ||
                  v.myApplicationStatus === 'SHORTLISTED') && (
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
                    Applied
                  </span>
                )}
                {(v.myApplicationStatus == null ||
                  v.myApplicationStatus === 'WITHDRAWN' ||
                  v.myApplicationStatus === 'REJECTED') && (
                  <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white">
                    Apply
                  </span>
                )}
              </div>
            </Link>
          ))}
          {volunteering.length === 0 && (
            <p className="rounded-xl border-2 border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500">
              No volunteer calls open right now — check back soon.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="font-mono text-[10px] tracking-wide text-zinc-500">
            PROGRAMS · INVITE-ONLY
          </div>
          {courses.map((c) => (
            <div
              key={c.cohortId}
              className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="font-bold leading-tight">{c.title}</div>
              <div className="font-mono text-[10px] tracking-wide text-zinc-500">
                {c.cohortLabel.toUpperCase()} · ASK YOUR FACILITATOR FOR AN INVITE
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <p className="text-center text-xs text-zinc-500">No live programs right now.</p>
          )}
        </div>
      </div>
      <BottomNav active="/discover" />
    </>
  );
}
