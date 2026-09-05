import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertInOrg } from '@/modules/organizations';
import { awardEventAttended } from '@/modules/recognition';

export class CheckInError extends Error {}

const CHECK_IN_OPENS_BEFORE_MS = 30 * 60 * 1000;
const CHECK_IN_CLOSES_AFTER_MS = 2 * 60 * 60 * 1000;

/**
 * The QR destination — a registered, logged-in participant visiting
 * `/events/[occurrenceId]/check-in?token=...` self-checks-in. The window
 * (30 min before start through 2h after end) is what stops the QR poster
 * being useful outside the actual event, per docs/plan.md's check-in
 * default. Reuses AttendanceConfirmationMethod.LIVE_ATTENDANCE, reserved
 * for exactly this in the Phase 1 schema.
 */
export async function selfCheckIn(input: {
  userId: string;
  checkInToken: string;
}): Promise<{ eventOccurrenceId: string }> {
  const occurrence = await prisma.eventOccurrence.findUnique({
    where: { checkInToken: input.checkInToken },
  });
  if (!occurrence) throw new CheckInError('This check-in link is invalid.');

  const registration = await prisma.eventRegistration.findUnique({
    where: { userId_eventOccurrenceId: { userId: input.userId, eventOccurrenceId: occurrence.id } },
  });
  if (!registration || registration.status !== 'REGISTERED') {
    throw new CheckInError("You're not registered for this event.");
  }

  const now = Date.now();
  const opensAt = occurrence.startsAt.getTime() - CHECK_IN_OPENS_BEFORE_MS;
  const closesAt = occurrence.endsAt.getTime() + CHECK_IN_CLOSES_AFTER_MS;
  if (now < opensAt) throw new CheckInError('Check-in has not opened for this event yet.');
  if (now > closesAt) throw new CheckInError('Check-in for this event has closed.');

  await prisma.eventCheckIn.upsert({
    where: { userId_eventOccurrenceId: { userId: input.userId, eventOccurrenceId: occurrence.id } },
    create: { userId: input.userId, eventOccurrenceId: occurrence.id, method: 'LIVE_ATTENDANCE' },
    update: {},
  });

  await awardEventAttended({
    userId: input.userId,
    organizationId: occurrence.organizationId,
    eventOccurrenceId: occurrence.id,
  });

  return { eventOccurrenceId: occurrence.id };
}

/** The manual fallback for when a participant can't scan the QR (no smartphone, connectivity issue, etc.) — mirrors overrideAttendance's shape exactly. */
export async function adminCheckIn(input: {
  userId: string;
  eventOccurrenceId: string;
  organizationId: string;
  checkedInByUserId: string;
}): Promise<void> {
  const occurrence = await prisma.eventOccurrence.findUniqueOrThrow({
    where: { id: input.eventOccurrenceId },
  });
  assertInOrg(occurrence.organizationId, input.organizationId);

  await prisma.eventCheckIn.upsert({
    where: {
      userId_eventOccurrenceId: {
        userId: input.userId,
        eventOccurrenceId: input.eventOccurrenceId,
      },
    },
    create: {
      userId: input.userId,
      eventOccurrenceId: input.eventOccurrenceId,
      method: 'ADMIN_OVERRIDE',
      checkedInByUserId: input.checkedInByUserId,
    },
    update: { method: 'ADMIN_OVERRIDE', checkedInByUserId: input.checkedInByUserId },
  });

  await awardEventAttended({
    userId: input.userId,
    organizationId: occurrence.organizationId,
    eventOccurrenceId: input.eventOccurrenceId,
  });
}
