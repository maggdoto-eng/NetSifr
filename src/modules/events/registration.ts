import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertOccurrenceInOrg } from '@/modules/organizations';

export class RegistrationError extends Error {}

/**
 * Registers past capacity waitlist instead of failing — see
 * docs/plan.md's capacity/waitlist default. The occurrence row is locked
 * for the duration of the transaction (`SELECT ... FOR UPDATE`) so two
 * concurrent registrations for the last seat can't both succeed as
 * REGISTERED; this is the one place in the app where that race actually
 * matters (overbooking is a real user-facing failure, unlike most of this
 * app's read-mostly admin actions).
 */
export async function registerForOccurrence(input: {
  userId: string;
  eventOccurrenceId: string;
  organizationId: string;
}): Promise<{ status: 'REGISTERED' | 'WAITLISTED' }> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "EventOccurrence" WHERE id = ${input.eventOccurrenceId} FOR UPDATE`;

    const occurrence = await tx.eventOccurrence.findUniqueOrThrow({
      where: { id: input.eventOccurrenceId },
    });
    if (occurrence.status !== 'LIVE') {
      throw new RegistrationError('This event is not open for registration.');
    }

    const existing = await tx.eventRegistration.findUnique({
      where: {
        userId_eventOccurrenceId: {
          userId: input.userId,
          eventOccurrenceId: input.eventOccurrenceId,
        },
      },
    });
    if (existing && existing.status !== 'CANCELLED') {
      throw new RegistrationError("You're already registered for this event.");
    }

    const registeredCount = await tx.eventRegistration.count({
      where: { eventOccurrenceId: input.eventOccurrenceId, status: 'REGISTERED' },
    });
    const status =
      occurrence.capacity == null || registeredCount < occurrence.capacity
        ? 'REGISTERED'
        : 'WAITLISTED';

    if (existing) {
      await tx.eventRegistration.update({
        where: { id: existing.id },
        data: { status, registeredAt: new Date(), cancelledAt: null },
      });
    } else {
      await tx.eventRegistration.create({
        data: {
          userId: input.userId,
          eventOccurrenceId: input.eventOccurrenceId,
          organizationId: input.organizationId,
          status,
        },
      });
    }

    return { status };
  });
}

/** Promotes the single oldest WAITLISTED registration when a REGISTERED seat opens up — the promoted row fills the exact seat that just freed, so capacity isn't re-checked. */
export async function cancelRegistration(registrationId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const registration = await tx.eventRegistration.findUniqueOrThrow({
      where: { id: registrationId },
    });
    if (registration.status === 'CANCELLED') return;

    await tx.$executeRaw`SELECT id FROM "EventOccurrence" WHERE id = ${registration.eventOccurrenceId} FOR UPDATE`;

    await tx.eventRegistration.update({
      where: { id: registrationId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    if (registration.status === 'REGISTERED') {
      const nextWaitlisted = await tx.eventRegistration.findFirst({
        where: { eventOccurrenceId: registration.eventOccurrenceId, status: 'WAITLISTED' },
        orderBy: { registeredAt: 'asc' },
      });
      if (nextWaitlisted) {
        await tx.eventRegistration.update({
          where: { id: nextWaitlisted.id },
          data: { status: 'REGISTERED' },
        });
      }
    }
  });
}

export async function getUserRegistration(userId: string, eventOccurrenceId: string) {
  return prisma.eventRegistration.findUnique({
    where: { userId_eventOccurrenceId: { userId, eventOccurrenceId } },
  });
}

/** Admin-facing roster — includes email (see docs/plan.md's admin-vs-participant field split, same as the course cohort roster). Org-scoped: the occurrence must belong to the caller's org. */
export async function getRegistrationsForOccurrence(
  eventOccurrenceId: string,
  organizationId: string,
) {
  await assertOccurrenceInOrg(eventOccurrenceId, organizationId);
  return prisma.eventRegistration.findMany({
    where: { eventOccurrenceId, status: { in: ['REGISTERED', 'WAITLISTED'] } },
    include: {
      user: { include: { credentials: { where: { type: 'EMAIL_PASSWORD' }, take: 1 } } },
    },
    orderBy: { registeredAt: 'asc' },
  });
}
