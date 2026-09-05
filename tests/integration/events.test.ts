import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createEvent,
  createOccurrence,
  updateOccurrenceStatus,
  registerForOccurrence,
  cancelRegistration,
  getUserRegistration,
  selfCheckIn,
  adminCheckIn,
  CheckInError,
  submitFeedback,
  FeedbackError,
  RegistrationError,
} from '@/modules/events';
import { createTestOrg, createTestAdmin, createTestUser, cleanupOrg } from '../support/fixtures';

async function createLiveOccurrence(input: {
  organizationId: string;
  ownerUserId: string;
  capacity?: number;
  startsAt?: Date;
  endsAt?: Date;
}) {
  const { eventId } = await createEvent({
    organizationId: input.organizationId,
    title: `Test Event ${Date.now()}`,
  });
  const now = new Date();
  const { occurrenceId } = await createOccurrence({
    eventId,
    organizationId: input.organizationId,
    ownerUserId: input.ownerUserId,
    startsAt: input.startsAt ?? new Date(now.getTime() - 5 * 60 * 1000),
    endsAt: input.endsAt ?? new Date(now.getTime() + 60 * 60 * 1000),
    capacity: input.capacity,
  });
  await updateOccurrenceStatus({
    occurrenceId,
    organizationId: input.organizationId,
    actingUserId: input.ownerUserId,
    status: 'LIVE',
  });
  return { eventId, occurrenceId };
}

describe('events: registration + waitlist', () => {
  let orgId: string;
  let adminUserId: string;
  let occurrenceId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const org = await createTestOrg();
    orgId = org.id;
    const admin = await createTestAdmin(orgId);
    adminUserId = admin.userId;
    userIds.push(adminUserId);
    const occurrence = await createLiveOccurrence({
      organizationId: orgId,
      ownerUserId: adminUserId,
      capacity: 1,
    });
    occurrenceId = occurrence.occurrenceId;
  });

  afterAll(async () => {
    await cleanupOrg(orgId, userIds);
  });

  it('registers the first participant as REGISTERED', async () => {
    const { userId } = await createTestUser('First Registrant');
    userIds.push(userId);
    const result = await registerForOccurrence({
      userId,
      eventOccurrenceId: occurrenceId,
      organizationId: orgId,
    });
    expect(result.status).toBe('REGISTERED');
  });

  it('waitlists a second participant once capacity is full', async () => {
    const { userId } = await createTestUser('Second Registrant');
    userIds.push(userId);
    const result = await registerForOccurrence({
      userId,
      eventOccurrenceId: occurrenceId,
      organizationId: orgId,
    });
    expect(result.status).toBe('WAITLISTED');
  });

  it('refuses a duplicate registration for the same user', async () => {
    const { userId } = await createTestUser('Duplicate Registrant');
    userIds.push(userId);
    await registerForOccurrence({ userId, eventOccurrenceId: occurrenceId, organizationId: orgId });
    await expect(
      registerForOccurrence({ userId, eventOccurrenceId: occurrenceId, organizationId: orgId }),
    ).rejects.toThrow(RegistrationError);
  });

  it('promotes the oldest waitlisted registration when a REGISTERED seat is cancelled', async () => {
    const first = await createTestUser('Seat Holder');
    userIds.push(first.userId);
    const second = await createTestUser('Waiting Promotee');
    userIds.push(second.userId);

    const { occurrenceId: freshOccurrenceId } = await createLiveOccurrence({
      organizationId: orgId,
      ownerUserId: adminUserId,
      capacity: 1,
    });

    const firstResult = await registerForOccurrence({
      userId: first.userId,
      eventOccurrenceId: freshOccurrenceId,
      organizationId: orgId,
    });
    expect(firstResult.status).toBe('REGISTERED');
    const secondResult = await registerForOccurrence({
      userId: second.userId,
      eventOccurrenceId: freshOccurrenceId,
      organizationId: orgId,
    });
    expect(secondResult.status).toBe('WAITLISTED');

    const firstRegistration = await getUserRegistration(first.userId, freshOccurrenceId);
    await cancelRegistration(firstRegistration!.id);

    const promoted = await getUserRegistration(second.userId, freshOccurrenceId);
    expect(promoted?.status).toBe('REGISTERED');
  });

  it('lets a cancelled registrant re-register (does not stay blocked as "already registered")', async () => {
    const { userId } = await createTestUser('Re-registrant');
    userIds.push(userId);
    const { occurrenceId: freshOccurrenceId } = await createLiveOccurrence({
      organizationId: orgId,
      ownerUserId: adminUserId,
    });

    const first = await registerForOccurrence({
      userId,
      eventOccurrenceId: freshOccurrenceId,
      organizationId: orgId,
    });
    expect(first.status).toBe('REGISTERED');
    const registration = await getUserRegistration(userId, freshOccurrenceId);
    await cancelRegistration(registration!.id);

    const second = await registerForOccurrence({
      userId,
      eventOccurrenceId: freshOccurrenceId,
      organizationId: orgId,
    });
    expect(second.status).toBe('REGISTERED');
  });
});

describe('events: check-in window + points', () => {
  let orgId: string;
  let adminUserId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const org = await createTestOrg();
    orgId = org.id;
    const admin = await createTestAdmin(orgId);
    adminUserId = admin.userId;
    userIds.push(adminUserId);
  });

  afterAll(async () => {
    await cleanupOrg(orgId, userIds);
  });

  it('rejects self check-in before the window opens', async () => {
    const { userId } = await createTestUser('Too Early');
    userIds.push(userId);
    const now = new Date();
    const { occurrenceId } = await createLiveOccurrence({
      organizationId: orgId,
      ownerUserId: adminUserId,
      startsAt: new Date(now.getTime() + 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    });
    await registerForOccurrence({ userId, eventOccurrenceId: occurrenceId, organizationId: orgId });
    const occurrence = await prisma.eventOccurrence.findUniqueOrThrow({
      where: { id: occurrenceId },
    });

    await expect(selfCheckIn({ userId, checkInToken: occurrence.checkInToken })).rejects.toThrow(
      CheckInError,
    );
  });

  it('rejects self check-in after the window closes', async () => {
    const { userId } = await createTestUser('Too Late');
    userIds.push(userId);
    const now = new Date();
    const { occurrenceId } = await createLiveOccurrence({
      organizationId: orgId,
      ownerUserId: adminUserId,
      startsAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    });
    await registerForOccurrence({ userId, eventOccurrenceId: occurrenceId, organizationId: orgId });
    const occurrence = await prisma.eventOccurrence.findUniqueOrThrow({
      where: { id: occurrenceId },
    });

    await expect(selfCheckIn({ userId, checkInToken: occurrence.checkInToken })).rejects.toThrow(
      CheckInError,
    );
  });

  it('rejects self check-in for a registered-but-not-attending token holder (wrong status)', async () => {
    const { userId } = await createTestUser('Unregistered Scanner');
    userIds.push(userId);
    const { occurrenceId } = await createLiveOccurrence({
      organizationId: orgId,
      ownerUserId: adminUserId,
    });
    const occurrence = await prisma.eventOccurrence.findUniqueOrThrow({
      where: { id: occurrenceId },
    });

    await expect(selfCheckIn({ userId, checkInToken: occurrence.checkInToken })).rejects.toThrow(
      CheckInError,
    );
  });

  it('checks in a registered user within the window and awards 150 points exactly once', async () => {
    const { userId } = await createTestUser('On Time');
    userIds.push(userId);
    const { occurrenceId } = await createLiveOccurrence({
      organizationId: orgId,
      ownerUserId: adminUserId,
    });
    await registerForOccurrence({ userId, eventOccurrenceId: occurrenceId, organizationId: orgId });
    const occurrence = await prisma.eventOccurrence.findUniqueOrThrow({
      where: { id: occurrenceId },
    });

    await selfCheckIn({ userId, checkInToken: occurrence.checkInToken });
    await selfCheckIn({ userId, checkInToken: occurrence.checkInToken }); // idempotent repeat visit

    const ledgerRows = await prisma.contributionEvent.findMany({
      where: { userId, type: 'EVENT_ATTENDED' },
    });
    expect(ledgerRows).toHaveLength(1);
    expect(ledgerRows[0].points).toBe(150);
  });

  it('admin manual check-in awards points the same as self check-in', async () => {
    const { userId } = await createTestUser('Manual Check-in');
    userIds.push(userId);
    const { occurrenceId } = await createLiveOccurrence({
      organizationId: orgId,
      ownerUserId: adminUserId,
    });
    await registerForOccurrence({ userId, eventOccurrenceId: occurrenceId, organizationId: orgId });

    await adminCheckIn({
      userId,
      eventOccurrenceId: occurrenceId,
      organizationId: orgId,
      checkedInByUserId: adminUserId,
    });

    const checkIn = await prisma.eventCheckIn.findUniqueOrThrow({
      where: { userId_eventOccurrenceId: { userId, eventOccurrenceId: occurrenceId } },
    });
    expect(checkIn.method).toBe('ADMIN_OVERRIDE');
    const ledgerRows = await prisma.contributionEvent.findMany({
      where: { userId, type: 'EVENT_ATTENDED' },
    });
    expect(ledgerRows).toHaveLength(1);
  });
});

describe('events: feedback gated on check-in', () => {
  let orgId: string;
  let adminUserId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const org = await createTestOrg();
    orgId = org.id;
    const admin = await createTestAdmin(orgId);
    adminUserId = admin.userId;
    userIds.push(adminUserId);
  });

  afterAll(async () => {
    await cleanupOrg(orgId, userIds);
  });

  it('refuses feedback from a user who never checked in', async () => {
    const { userId } = await createTestUser('Never Attended');
    userIds.push(userId);
    const { occurrenceId } = await createLiveOccurrence({
      organizationId: orgId,
      ownerUserId: adminUserId,
    });
    await registerForOccurrence({ userId, eventOccurrenceId: occurrenceId, organizationId: orgId });

    await expect(
      submitFeedback({ userId, eventOccurrenceId: occurrenceId, rating: 5 }),
    ).rejects.toThrow(FeedbackError);
  });

  it('rejects an out-of-range rating even for a checked-in user', async () => {
    const { userId } = await createTestUser('Bad Rating');
    userIds.push(userId);
    const { occurrenceId } = await createLiveOccurrence({
      organizationId: orgId,
      ownerUserId: adminUserId,
    });
    await registerForOccurrence({ userId, eventOccurrenceId: occurrenceId, organizationId: orgId });
    await adminCheckIn({
      userId,
      eventOccurrenceId: occurrenceId,
      organizationId: orgId,
      checkedInByUserId: adminUserId,
    });

    await expect(
      submitFeedback({ userId, eventOccurrenceId: occurrenceId, rating: 6 }),
    ).rejects.toThrow(FeedbackError);
  });

  it('accepts feedback once checked in, and lets the same user edit it', async () => {
    const { userId } = await createTestUser('Happy Attendee');
    userIds.push(userId);
    const { occurrenceId } = await createLiveOccurrence({
      organizationId: orgId,
      ownerUserId: adminUserId,
    });
    await registerForOccurrence({ userId, eventOccurrenceId: occurrenceId, organizationId: orgId });
    await adminCheckIn({
      userId,
      eventOccurrenceId: occurrenceId,
      organizationId: orgId,
      checkedInByUserId: adminUserId,
    });

    await submitFeedback({
      userId,
      eventOccurrenceId: occurrenceId,
      rating: 4,
      comment: 'Loved it',
    });
    await submitFeedback({
      userId,
      eventOccurrenceId: occurrenceId,
      rating: 5,
      comment: 'Actually, 5',
    });

    const feedback = await prisma.eventFeedback.findUniqueOrThrow({
      where: { userId_eventOccurrenceId: { userId, eventOccurrenceId: occurrenceId } },
    });
    expect(feedback.rating).toBe(5);
    expect(feedback.comment).toBe('Actually, 5');
  });
});
