import 'server-only';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { assertRecordingModuleInOrg } from '@/modules/organizations';
import {
  lockCourseVersionOnFirstActivity,
  getCourseVersionIdForModule,
  resolveUserCohortContext,
} from './course-version';
import { awardAttendanceConfirmed } from '@/modules/recognition';

export class AttendanceError extends Error {}

const MAX_HEARTBEAT_DELTA_SECONDS = 30;
const DEFAULT_UNLOCK_MINUTES = 10;

/**
 * A RecordingModule's CourseVersion can be shared by more than one Cohort
 * (after duplication), so the unlock threshold has to resolve through the
 * user's *actual* enrolled cohort, not just "the first one" — the module
 * itself only overrides that default when unlockMinutesOverride is set.
 */
export async function resolveUnlockSeconds(
  userId: string,
  recordingModuleId: string,
): Promise<number> {
  const recording = await prisma.recordingModule.findUniqueOrThrow({
    where: { moduleId: recordingModuleId },
    include: { module: { select: { week: { select: { courseVersionId: true } } } } },
  });
  if (recording.unlockMinutesOverride != null) return recording.unlockMinutesOverride * 60;

  const enrolment = await prisma.enrolment.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      cohort: { courseVersionId: recording.module.week.courseVersionId },
    },
    include: { cohort: { select: { attendanceUnlockMinutes: true } } },
  });
  return (enrolment?.cohort.attendanceUnlockMinutes ?? DEFAULT_UNLOCK_MINUTES) * 60;
}

/** Ends any previous active session for this (user, recording) before starting a new one — enforces "one active session" at the app layer alongside the DB's partial unique index. */
export async function startPlaybackSession(
  userId: string,
  recordingModuleId: string,
): Promise<{ nonce: string }> {
  const nonce = randomBytes(16).toString('base64url');
  await prisma.$transaction([
    prisma.playbackSession.updateMany({
      where: { userId, recordingModuleId, endedAt: null },
      data: { endedAt: new Date() },
    }),
    prisma.playbackSession.create({ data: { userId, recordingModuleId, nonce } }),
  ]);
  return { nonce };
}

export async function recordHeartbeat(input: {
  userId: string;
  recordingModuleId: string;
  nonce: string;
  deltaSeconds: number;
}): Promise<{ engagedSeconds: number; unlockSeconds: number; thresholdReached: boolean }> {
  const session = await prisma.playbackSession.findUnique({ where: { nonce: input.nonce } });
  if (
    !session ||
    session.userId !== input.userId ||
    session.recordingModuleId !== input.recordingModuleId ||
    session.endedAt
  ) {
    throw new AttendanceError('This viewing session has ended — reload the recording.');
  }
  await prisma.playbackSession.update({
    where: { id: session.id },
    data: { lastHeartbeatAt: new Date() },
  });

  const clampedDelta = Math.max(
    0,
    Math.min(MAX_HEARTBEAT_DELTA_SECONDS, Math.round(input.deltaSeconds)),
  );
  const unlockSeconds = await resolveUnlockSeconds(input.userId, input.recordingModuleId);

  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      userId_recordingModuleId: {
        userId: input.userId,
        recordingModuleId: input.recordingModuleId,
      },
    },
  });
  const engagedSeconds = (existing?.engagedSeconds ?? 0) + clampedDelta;
  const thresholdReached = engagedSeconds >= unlockSeconds;

  await prisma.attendanceRecord.upsert({
    where: {
      userId_recordingModuleId: {
        userId: input.userId,
        recordingModuleId: input.recordingModuleId,
      },
    },
    create: {
      userId: input.userId,
      recordingModuleId: input.recordingModuleId,
      engagedSeconds,
      engagementThresholdReachedAt: thresholdReached ? new Date() : null,
    },
    update: {
      engagedSeconds,
      engagementThresholdReachedAt: thresholdReached
        ? (existing?.engagementThresholdReachedAt ?? new Date())
        : existing?.engagementThresholdReachedAt,
    },
  });

  return { engagedSeconds, unlockSeconds, thresholdReached };
}

/** Server-side re-validates the threshold — never trusts a client-sent "I watched enough" flag. */
export async function markAttended(userId: string, recordingModuleId: string): Promise<void> {
  const [record, unlockSeconds] = await Promise.all([
    prisma.attendanceRecord.findUnique({
      where: { userId_recordingModuleId: { userId, recordingModuleId } },
    }),
    resolveUnlockSeconds(userId, recordingModuleId),
  ]);

  if (!record || record.engagedSeconds < unlockSeconds) {
    throw new AttendanceError('Keep the recording open a little longer before marking attended.');
  }
  if (record.attendanceConfirmedAt) return;

  await prisma.attendanceRecord.update({
    where: { userId_recordingModuleId: { userId, recordingModuleId } },
    data: { attendanceConfirmedAt: new Date(), attendanceConfirmationMethod: 'ENGAGEMENT_PROXY' },
  });

  const courseVersionId = await getCourseVersionIdForModule(recordingModuleId);
  await lockCourseVersionOnFirstActivity(courseVersionId);

  const cohortContext = await resolveUserCohortContext(userId, courseVersionId);
  if (cohortContext) {
    await awardAttendanceConfirmed({ userId, ...cohortContext, recordingModuleId });
  }
}

/** The manual fallback for when the engagement-proxy heuristic misfires (see docs/plan.md's known limitation). */
export async function overrideAttendance(input: {
  userId: string;
  recordingModuleId: string;
  organizationId: string;
  overriddenByUserId: string;
  note?: string;
}): Promise<void> {
  await assertRecordingModuleInOrg(input.recordingModuleId, input.organizationId);
  await prisma.attendanceRecord.upsert({
    where: {
      userId_recordingModuleId: {
        userId: input.userId,
        recordingModuleId: input.recordingModuleId,
      },
    },
    create: {
      userId: input.userId,
      recordingModuleId: input.recordingModuleId,
      attendanceConfirmedAt: new Date(),
      attendanceConfirmationMethod: 'ADMIN_OVERRIDE',
      overriddenByUserId: input.overriddenByUserId,
      overrideNote: input.note,
    },
    update: {
      attendanceConfirmedAt: new Date(),
      attendanceConfirmationMethod: 'ADMIN_OVERRIDE',
      overriddenByUserId: input.overriddenByUserId,
      overrideNote: input.note,
    },
  });

  const courseVersionId = await getCourseVersionIdForModule(input.recordingModuleId);
  await lockCourseVersionOnFirstActivity(courseVersionId);

  const cohortContext = await resolveUserCohortContext(input.userId, courseVersionId);
  if (cohortContext) {
    await awardAttendanceConfirmed({
      userId: input.userId,
      ...cohortContext,
      recordingModuleId: input.recordingModuleId,
    });
  }
}
