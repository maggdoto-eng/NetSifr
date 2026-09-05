import 'server-only';
import { prisma } from '@/lib/prisma';

/**
 * Point values and the "what counts, once" rules below are ported directly
 * from the Claude Design prototype's `points(id)` reducer (README/chats
 * transcript) — attendance/reading are flat per-module awards, quiz points
 * are 1.5x the score percent, and an assignment is worth 80 on submission
 * plus 60 more the first time it's graded (any grade — the prototype only
 * checks presence of a grade, not its label). Bumping this requires bumping
 * POINTS_POLICY_VERSION so historical ContributionEvent rows stay
 * attributable to the formula that actually produced them.
 */
export const POINTS_POLICY_VERSION = 1;
const ATTENDANCE_POINTS = 100;
const READING_POINTS = 40;
const QUIZ_POINTS_PER_PERCENT = 1.5;
const ASSIGNMENT_SUBMITTED_POINTS = 80;
const ASSIGNMENT_GRADED_POINTS = 60;
/// Between reading (40) and a full quiz (150) on Phase 1's existing scale —
/// see docs/plan.md's Phase 2 default. Tunable later via
/// POINTS_POLICY_VERSION exactly like quiz scoring already is.
const EVENT_ATTENDED_POINTS = 150;
/// 20 points per verified volunteer hour (rounded) — see docs/plan.md's
/// Phase 3 decisions. A typical 2–4h shift lands between a reading (40) and a
/// full quiz (150), in scale with the existing economy; tunable via
/// POINTS_POLICY_VERSION.
const VOLUNTEER_HOUR_POINTS = 20;

/** Creates the ledger row if it doesn't exist yet; a repeat call (e.g. an admin re-running an override) is a no-op — this is what makes every award function below safe to call unconditionally. */
async function awardOnce(input: {
  idempotencyKey: string;
  userId: string;
  organizationId: string;
  /// Null for activity types that aren't cohort-scoped (e.g. events) —
  /// getCohortPoints simply never matches those rows, which is correct.
  cohortId?: string;
  type:
    | 'ATTENDANCE_CONFIRMED'
    | 'READING_COMPLETED'
    | 'ASSIGNMENT_SUBMITTED'
    | 'ASSIGNMENT_GRADED'
    | 'EVENT_ATTENDED'
    | 'VOLUNTEER_HOURS_VERIFIED';
  sourceType: string;
  sourceId: string;
  points: number;
}): Promise<void> {
  await prisma.contributionEvent.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    create: {
      idempotencyKey: input.idempotencyKey,
      userId: input.userId,
      organizationId: input.organizationId,
      cohortId: input.cohortId,
      type: input.type,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      points: input.points,
      pointsPolicyVersion: POINTS_POLICY_VERSION,
    },
    update: {},
  });
}

export async function awardAttendanceConfirmed(input: {
  userId: string;
  organizationId: string;
  cohortId: string;
  recordingModuleId: string;
}): Promise<void> {
  await awardOnce({
    idempotencyKey: `attendance-confirmed:${input.recordingModuleId}:${input.userId}`,
    userId: input.userId,
    organizationId: input.organizationId,
    cohortId: input.cohortId,
    type: 'ATTENDANCE_CONFIRMED',
    sourceType: 'AttendanceRecord',
    sourceId: input.recordingModuleId,
    points: ATTENDANCE_POINTS,
  });
}

export async function awardReadingCompleted(input: {
  userId: string;
  organizationId: string;
  cohortId: string;
  readingModuleId: string;
}): Promise<void> {
  await awardOnce({
    idempotencyKey: `reading-completed:${input.readingModuleId}:${input.userId}`,
    userId: input.userId,
    organizationId: input.organizationId,
    cohortId: input.cohortId,
    type: 'READING_COMPLETED',
    sourceType: 'ReadingProgress',
    sourceId: input.readingModuleId,
    points: READING_POINTS,
  });
}

/**
 * Quiz points are the one deliberate exception to "the ledger is append-only":
 * the product decision is that only the *best* of the 2 allowed attempts
 * counts (see docs/plan.md), and every other total on this page is a flat
 * SUM over the ledger — so a single row per (user, quiz) is kept up to date
 * with the best score's points rather than writing a second row a reader
 * would have to know to deduplicate. All raw attempts are still preserved
 * in full in QuizAttempt regardless of what this writes.
 */
export async function awardQuizScored(input: {
  userId: string;
  organizationId: string;
  cohortId: string;
  quizModuleId: string;
  scorePercent: number;
  attemptId: string;
}): Promise<void> {
  const idempotencyKey = `quiz-scored:${input.quizModuleId}:${input.userId}`;
  const points = Math.round(input.scorePercent * QUIZ_POINTS_PER_PERCENT);

  const existing = await prisma.contributionEvent.findUnique({ where: { idempotencyKey } });
  if (!existing) {
    await prisma.contributionEvent.create({
      data: {
        idempotencyKey,
        userId: input.userId,
        organizationId: input.organizationId,
        cohortId: input.cohortId,
        type: 'QUIZ_SCORED',
        sourceType: 'QuizAttempt',
        sourceId: input.attemptId,
        points,
        pointsPolicyVersion: POINTS_POLICY_VERSION,
      },
    });
    return;
  }
  if (points > existing.points) {
    await prisma.contributionEvent.update({
      where: { idempotencyKey },
      data: { points, sourceId: input.attemptId, occurredAt: new Date() },
    });
  }
}

/** Only the first-ever submission for a given assignment awards points (matches the prototype: resubmission after NEEDS_WORK doesn't re-earn the submission bonus). */
export async function awardAssignmentSubmitted(input: {
  userId: string;
  organizationId: string;
  cohortId: string;
  assignmentModuleId: string;
  submissionId: string;
  attemptNumber: number;
}): Promise<void> {
  if (input.attemptNumber !== 1) return;
  await awardOnce({
    idempotencyKey: `assignment-submitted:${input.assignmentModuleId}:${input.userId}`,
    userId: input.userId,
    organizationId: input.organizationId,
    cohortId: input.cohortId,
    type: 'ASSIGNMENT_SUBMITTED',
    sourceType: 'Submission',
    sourceId: input.submissionId,
    points: ASSIGNMENT_SUBMITTED_POINTS,
  });
}

/** Only the first-ever grade on an assignment awards points — a re-grade after a NEEDS_WORK resubmission doesn't award it twice. */
export async function awardAssignmentGraded(input: {
  userId: string;
  organizationId: string;
  cohortId: string;
  assignmentModuleId: string;
  gradeId: string;
}): Promise<void> {
  await awardOnce({
    idempotencyKey: `assignment-graded:${input.assignmentModuleId}:${input.userId}`,
    userId: input.userId,
    organizationId: input.organizationId,
    cohortId: input.cohortId,
    type: 'ASSIGNMENT_GRADED',
    sourceType: 'Grade',
    sourceId: input.gradeId,
    points: ASSIGNMENT_GRADED_POINTS,
  });
}

/** Not cohort-scoped — awarded once per (user, occurrence) on check-in, whether self (QR) or admin-manual. */
export async function awardEventAttended(input: {
  userId: string;
  organizationId: string;
  eventOccurrenceId: string;
}): Promise<void> {
  await awardOnce({
    idempotencyKey: `event-attended:${input.eventOccurrenceId}:${input.userId}`,
    userId: input.userId,
    organizationId: input.organizationId,
    type: 'EVENT_ATTENDED',
    sourceType: 'EventCheckIn',
    sourceId: input.eventOccurrenceId,
    points: EVENT_ATTENDED_POINTS,
  });
}

/** Awarded once per verified ServiceLog (keyed by the log id) — 20 pts/hour, rounded. Not cohort-scoped. */
export async function awardVolunteerHoursVerified(input: {
  userId: string;
  organizationId: string;
  serviceLogId: string;
  hours: number;
}): Promise<void> {
  await awardOnce({
    idempotencyKey: `volunteer-hours-verified:${input.serviceLogId}`,
    userId: input.userId,
    organizationId: input.organizationId,
    type: 'VOLUNTEER_HOURS_VERIFIED',
    sourceType: 'ServiceLog',
    sourceId: input.serviceLogId,
    points: Math.round(input.hours * VOLUNTEER_HOUR_POINTS),
  });
}

export async function getCohortPoints(userId: string, cohortId: string): Promise<number> {
  const result = await prisma.contributionEvent.aggregate({
    where: { userId, cohortId },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}

export async function getTotalPoints(userId: string): Promise<number> {
  const result = await prisma.contributionEvent.aggregate({
    where: { userId },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}

/**
 * Matches the prototype's literal (if loosely named) "streak": the count of
 * recordings attended in this cohort — not a consecutive-day count. Read
 * directly off AttendanceRecord rather than the ledger so it stays correct
 * even if the points policy changes later.
 */
export async function getCohortStreak(userId: string, cohortId: string): Promise<number> {
  const cohort = await prisma.cohort.findUniqueOrThrow({
    where: { id: cohortId },
    select: { courseVersionId: true },
  });

  const recordingModuleIds = await prisma.recordingModule
    .findMany({
      where: { module: { week: { courseVersionId: cohort.courseVersionId } } },
      select: { moduleId: true },
    })
    .then((rows) => rows.map((r) => r.moduleId));
  if (recordingModuleIds.length === 0) return 0;

  return prisma.attendanceRecord.count({
    where: {
      userId,
      recordingModuleId: { in: recordingModuleIds },
      attendanceConfirmedAt: { not: null },
    },
  });
}
