import 'server-only';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { uniqueSlug } from '@/lib/slug';
import { assertInOrg } from '@/modules/organizations';
import type {
  EventOccurrenceStatus,
  LocationMode,
  OpportunityStatus,
} from '@/generated/prisma/client';

export async function createEvent(input: {
  organizationId: string;
  title: string;
  description?: string;
}): Promise<{ eventId: string }> {
  const event = await prisma.event.create({
    data: {
      organizationId: input.organizationId,
      title: input.title,
      description: input.description,
    },
  });
  return { eventId: event.id };
}

/**
 * Also creates the 1:1 Opportunity row with type EVENT and
 * visibility PUBLIC — the self-service default (opposite of Cohort's
 * INVITE_ONLY) that's what makes /discover worth browsing, per
 * docs/plan.md. checkInToken is the opaque value embedded in the
 * QR/check-in URL — generated once here, never regenerated.
 */
export async function createOccurrence(input: {
  eventId: string;
  organizationId: string;
  ownerUserId: string;
  startsAt: Date;
  endsAt: Date;
  locationMode?: LocationMode;
  locationId?: string;
  capacity?: number;
}): Promise<{ occurrenceId: string }> {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: input.eventId } });
  // The occurrence's org is taken from input, but the parent Event must
  // actually belong to it — otherwise an admin could hang an occurrence off
  // another org's Event by id.
  assertInOrg(event.organizationId, input.organizationId);
  const checkInToken = randomBytes(16).toString('base64url');

  const occurrence = await prisma.$transaction(async (tx) => {
    const opportunity = await tx.opportunity.create({
      data: {
        organizationId: input.organizationId,
        type: 'EVENT',
        title: event.title,
        slug: uniqueSlug(event.title),
        visibility: 'PUBLIC',
        status: 'DRAFT',
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        capacity: input.capacity,
        locationMode: input.locationMode ?? 'ONLINE',
        locationId: input.locationId,
        ownerUserId: input.ownerUserId,
      },
    });

    return tx.eventOccurrence.create({
      data: {
        eventId: input.eventId,
        opportunityId: opportunity.id,
        organizationId: input.organizationId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        locationMode: input.locationMode ?? 'ONLINE',
        locationId: input.locationId,
        capacity: input.capacity,
        checkInToken,
      },
    });
  });

  return { occurrenceId: occurrence.id };
}

/** EventOccurrenceStatus has no direct OpportunityStatus equivalent for COMPLETED/CANCELLED — both fold to ARCHIVED there, since Opportunity only needs to know "still live and discoverable" vs not. */
function toOpportunityStatus(status: EventOccurrenceStatus): OpportunityStatus {
  if (status === 'DRAFT') return 'DRAFT';
  if (status === 'LIVE') return 'LIVE';
  return 'ARCHIVED';
}

export async function getEventsForOrg(organizationId: string) {
  return prisma.event.findMany({
    where: { organizationId },
    include: { occurrences: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getEventWithOccurrences(eventId: string, organizationId: string) {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: { occurrences: { orderBy: { startsAt: 'asc' } } },
  });
  assertInOrg(event.organizationId, organizationId);
  return event;
}

/**
 * Dual-use read: the admin occurrence pages pass `organizationId` to scope
 * the lookup to their org; the participant `/discover` detail page reads a
 * PUBLIC occurrence with no org context and omits it.
 */
export async function getOccurrenceDetail(occurrenceId: string, organizationId?: string) {
  const occurrence = await prisma.eventOccurrence.findUniqueOrThrow({
    where: { id: occurrenceId },
    include: { event: true, opportunity: true, location: true },
  });
  if (organizationId !== undefined) assertInOrg(occurrence.organizationId, organizationId);
  return occurrence;
}

/** "My Events" — every occurrence the user has a live registration for, or has checked into (so a past event they attended still shows up even if their registration record was superseded). */
export async function getMyEvents(userId: string) {
  const [registrations, checkIns] = await Promise.all([
    prisma.eventRegistration.findMany({
      where: { userId, status: { in: ['REGISTERED', 'WAITLISTED'] } },
      include: { eventOccurrence: { include: { event: true } } },
      orderBy: { eventOccurrence: { startsAt: 'asc' } },
    }),
    prisma.eventCheckIn.findMany({
      where: { userId },
      select: { eventOccurrenceId: true },
    }),
  ]);
  const checkedInOccurrenceIds = new Set(checkIns.map((c) => c.eventOccurrenceId));

  return registrations.map((r) => ({
    registrationId: r.id,
    status: r.status,
    occurrenceId: r.eventOccurrence.id,
    eventTitle: r.eventOccurrence.event.title,
    startsAt: r.eventOccurrence.startsAt,
    endsAt: r.eventOccurrence.endsAt,
    checkedIn: checkedInOccurrenceIds.has(r.eventOccurrence.id),
  }));
}

export async function updateOccurrenceStatus(input: {
  occurrenceId: string;
  organizationId: string;
  actingUserId: string;
  status: EventOccurrenceStatus;
}): Promise<void> {
  const occurrence = await prisma.eventOccurrence.findUniqueOrThrow({
    where: { id: input.occurrenceId },
  });
  assertInOrg(occurrence.organizationId, input.organizationId);

  await prisma.$transaction([
    prisma.eventOccurrence.update({ where: { id: occurrence.id }, data: { status: input.status } }),
    prisma.opportunity.update({
      where: { id: occurrence.opportunityId },
      data: { status: toOpportunityStatus(input.status) },
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: occurrence.organizationId,
        actorUserId: input.actingUserId,
        action: 'event_occurrence.status_changed',
        targetType: 'EventOccurrence',
        targetId: occurrence.id,
        metadata: { from: occurrence.status, to: input.status },
      },
    }),
  ]);
}
