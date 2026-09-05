import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  startPlaybackSession,
  recordHeartbeat,
  markAttended,
  overrideAttendance,
  AttendanceError,
} from '@/modules/learning';
import {
  createTestOrg,
  createTestAdmin,
  createTestUser,
  createLiveCohortWithModules,
  enrolUser,
  cleanupOrg,
} from '../support/fixtures';

describe('engagement-proxy attendance', () => {
  let orgId: string;
  let adminUserId: string;
  let userId: string;
  let recordingModuleId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const org = await createTestOrg();
    orgId = org.id;
    const admin = await createTestAdmin(orgId);
    adminUserId = admin.userId;
    userIds.push(adminUserId);

    const cohort = await createLiveCohortWithModules({
      organizationId: orgId,
      ownerUserId: adminUserId,
    });
    recordingModuleId = cohort.recordingModuleId;
    // Default cohorts unlock at 10 min — override to a near-instant threshold for the test.
    await prisma.recordingModule.update({
      where: { moduleId: recordingModuleId },
      data: { unlockMinutesOverride: 0 },
    });

    const participant = await createTestUser('Attendee');
    userId = participant.userId;
    userIds.push(userId);
    await enrolUser({
      cohortId: cohort.cohortId,
      userId,
      email: participant.email,
      createdByUserId: adminUserId,
    });
  });

  afterAll(async () => {
    await cleanupOrg(orgId, userIds);
  });

  it('refuses to mark attended before any engagement is recorded', async () => {
    await expect(markAttended(userId, recordingModuleId)).rejects.toThrow(AttendanceError);
  });

  it('rejects a heartbeat carrying a stale/foreign nonce', async () => {
    await expect(
      recordHeartbeat({
        userId,
        recordingModuleId,
        nonce: 'not-a-real-nonce',
        deltaSeconds: 5,
      }),
    ).rejects.toThrow(AttendanceError);
  });

  it('confirms attendance once engaged time clears the (here, zero-second) threshold', async () => {
    const { nonce } = await startPlaybackSession(userId, recordingModuleId);
    const heartbeat = await recordHeartbeat({ userId, recordingModuleId, nonce, deltaSeconds: 5 });
    expect(heartbeat.thresholdReached).toBe(true);

    await markAttended(userId, recordingModuleId);

    const record = await prisma.attendanceRecord.findUniqueOrThrow({
      where: { userId_recordingModuleId: { userId, recordingModuleId } },
    });
    expect(record.attendanceConfirmedAt).not.toBeNull();
    expect(record.attendanceConfirmationMethod).toBe('ENGAGEMENT_PROXY');
  });

  it('starting a new playback session invalidates the previous one (one active session per user+recording)', async () => {
    const { userId: secondUserId, email } = await createTestUser('Second Attendee');
    userIds.push(secondUserId);
    const cohort = await prisma.recordingModule.findUniqueOrThrow({
      where: { moduleId: recordingModuleId },
      include: { module: { include: { week: true } } },
    });
    const liveCohort = await prisma.cohort.findFirstOrThrow({
      where: { courseVersionId: cohort.module.week.courseVersionId },
    });
    await enrolUser({
      cohortId: liveCohort.id,
      userId: secondUserId,
      email,
      createdByUserId: adminUserId,
    });

    const first = await startPlaybackSession(secondUserId, recordingModuleId);
    await startPlaybackSession(secondUserId, recordingModuleId); // ends the first session

    await expect(
      recordHeartbeat({
        userId: secondUserId,
        recordingModuleId,
        nonce: first.nonce,
        deltaSeconds: 5,
      }),
    ).rejects.toThrow(AttendanceError);
  });

  it('lets an admin override attendance for the engagement-proxy false-negative case', async () => {
    const { userId: overrideUserId, email } = await createTestUser('Override Target');
    userIds.push(overrideUserId);
    const cohort = await prisma.recordingModule.findUniqueOrThrow({
      where: { moduleId: recordingModuleId },
      include: { module: { include: { week: true } } },
    });
    const liveCohort = await prisma.cohort.findFirstOrThrow({
      where: { courseVersionId: cohort.module.week.courseVersionId },
    });
    await enrolUser({
      cohortId: liveCohort.id,
      userId: overrideUserId,
      email,
      createdByUserId: adminUserId,
    });

    await overrideAttendance({
      userId: overrideUserId,
      recordingModuleId,
      organizationId: orgId,
      overriddenByUserId: adminUserId,
      note: 'Confirmed attendance over a call.',
    });

    const record = await prisma.attendanceRecord.findUniqueOrThrow({
      where: { userId_recordingModuleId: { userId: overrideUserId, recordingModuleId } },
    });
    expect(record.attendanceConfirmationMethod).toBe('ADMIN_OVERRIDE');
    expect(record.overriddenByUserId).toBe(adminUserId);
  });
});
