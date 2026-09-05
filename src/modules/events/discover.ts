import 'server-only';
import { prisma } from '@/lib/prisma';
import type { LocationMode, EventRegistrationStatus } from '@/generated/prisma/client';

export type DiscoverEventCard = {
  occurrenceId: string;
  eventTitle: string;
  startsAt: Date;
  endsAt: Date;
  locationMode: LocationMode;
  capacity: number | null;
  registeredCount: number;
  /// Never CANCELLED in practice — the query only fetches REGISTERED/WAITLISTED — but typed against the full enum since Prisma can't narrow a runtime filter into the field's static type.
  myRegistrationStatus: EventRegistrationStatus | null;
};

export type DiscoverCourseCard = {
  cohortId: string;
  title: string;
  cohortLabel: string;
};

/**
 * Feeds /discover — LIVE Events (self-registerable, so each card carries
 * the current user's registration status) alongside LIVE Course cohorts
 * shown read-only (Courses stay invite-only, see docs/plan.md's Phase 2
 * default) — this is the moment /discover "earns its keep" per
 * docs/plan.md, since Phase 1 alone only had one Opportunity type worth
 * browsing.
 */
export async function getDiscoverFeed(
  organizationId: string,
  userId: string,
): Promise<{ events: DiscoverEventCard[]; courses: DiscoverCourseCard[] }> {
  const [occurrences, cohorts] = await Promise.all([
    prisma.eventOccurrence.findMany({
      where: { organizationId, status: 'LIVE' },
      include: { event: true, registrations: { where: { status: 'REGISTERED' } } },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.cohort.findMany({
      where: { organizationId, status: 'LIVE' },
      include: { opportunity: true },
      orderBy: { startsAt: 'asc' },
    }),
  ]);

  const myRegistrations = await prisma.eventRegistration.findMany({
    where: {
      userId,
      eventOccurrenceId: { in: occurrences.map((o) => o.id) },
      status: { in: ['REGISTERED', 'WAITLISTED'] },
    },
  });
  const myStatusByOccurrence = new Map(myRegistrations.map((r) => [r.eventOccurrenceId, r.status]));

  return {
    events: occurrences.map((o) => ({
      occurrenceId: o.id,
      eventTitle: o.event.title,
      startsAt: o.startsAt,
      endsAt: o.endsAt,
      locationMode: o.locationMode,
      capacity: o.capacity,
      registeredCount: o.registrations.length,
      myRegistrationStatus: myStatusByOccurrence.get(o.id) ?? null,
    })),
    courses: cohorts.map((c) => ({
      cohortId: c.id,
      title: c.opportunity.title,
      cohortLabel: c.cohortLabel,
    })),
  };
}
