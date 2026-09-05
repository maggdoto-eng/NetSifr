import 'server-only';
import { prisma } from '@/lib/prisma';

export class CourseVersionLockedError extends Error {
  constructor() {
    super(
      'This course version has learner activity and can no longer be edited — publish a new version instead.',
    );
  }
}

/**
 * Called at the start of every Week/Module mutation. Editing content after
 * a Cohort running this version has any activity would silently rewrite
 * graded history — see docs/plan.md's Course/Cohort/immutability section.
 */
export async function assertCourseVersionEditable(courseVersionId: string): Promise<void> {
  const version = await prisma.courseVersion.findUniqueOrThrow({
    where: { id: courseVersionId },
    select: { lockedAt: true },
  });
  if (version.lockedAt) {
    throw new CourseVersionLockedError();
  }
}

/**
 * Called the first time an activity record (attendance/quiz attempt/
 * submission) is written for any cohort running this version. Idempotent —
 * the `lockedAt: null` guard means calling this repeatedly is a no-op once
 * locked, so callers never need to check-then-set themselves.
 */
export async function lockCourseVersionOnFirstActivity(courseVersionId: string): Promise<void> {
  await prisma.courseVersion.updateMany({
    where: { id: courseVersionId, lockedAt: null },
    data: { lockedAt: new Date() },
  });
}

/** Resolves a module's courseVersionId — the common path into the two guards above. */
export async function getCourseVersionIdForModule(moduleId: string): Promise<string> {
  const module_ = await prisma.module.findUniqueOrThrow({
    where: { id: moduleId },
    select: { week: { select: { courseVersionId: true } } },
  });
  return module_.week.courseVersionId;
}

/**
 * A CourseVersion can be run by more than one Cohort (after duplication), so
 * awarding a ContributionEvent for an activity has to resolve through the
 * user's *actual* enrolled cohort — same reasoning as
 * attendance.ts#resolveUnlockSeconds. Returns null if the user has no active
 * enrolment in any cohort running this version (shouldn't happen for an
 * action that itself required that enrolment, but callers treat this as
 * "skip the points award" rather than throwing).
 */
export async function resolveUserCohortContext(
  userId: string,
  courseVersionId: string,
): Promise<{ cohortId: string; organizationId: string } | null> {
  const enrolment = await prisma.enrolment.findFirst({
    where: { userId, status: 'ACTIVE', cohort: { courseVersionId } },
    select: { cohortId: true, organizationId: true },
  });
  return enrolment;
}
