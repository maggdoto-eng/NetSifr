import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertSubmissionInOrg } from '@/modules/organizations';
import {
  lockCourseVersionOnFirstActivity,
  getCourseVersionIdForModule,
  resolveUserCohortContext,
} from './course-version';
import { awardAssignmentSubmitted, awardAssignmentGraded } from '@/modules/recognition';

export class AssignmentError extends Error {}

const MAX_ATTEMPTS = 2;

export type AssignmentForTaking = {
  assignmentModuleId: string;
  prompt: string;
  softDeadline: Date;
  latestSubmission: {
    attemptNumber: number;
    bodyText: string;
    submittedAt: Date;
    isLate: boolean;
    grade: { label: 'NEEDS_WORK' | 'GOOD' | 'EXCELLENT'; feedback: string; gradedAt: Date } | null;
  } | null;
  canSubmit: boolean;
};

export async function getAssignmentForTaking(
  userId: string,
  assignmentModuleId: string,
): Promise<AssignmentForTaking> {
  const assignmentModule = await prisma.assignmentModule.findUniqueOrThrow({
    where: { moduleId: assignmentModuleId },
  });

  const submissions = await prisma.submission.findMany({
    where: { userId, assignmentModuleId },
    orderBy: { attemptNumber: 'asc' },
    include: { grade: true },
  });
  const latest = submissions.at(-1) ?? null;

  let canSubmit = true;
  if (latest) {
    if (!latest.grade) {
      canSubmit = true; // ungraded — in-place edit
    } else if (latest.grade.label === 'NEEDS_WORK' && latest.attemptNumber < MAX_ATTEMPTS) {
      canSubmit = true; // one retry available
    } else {
      canSubmit = false; // graded non-NEEDS_WORK, or attempts exhausted
    }
  }

  return {
    assignmentModuleId,
    prompt: assignmentModule.prompt,
    softDeadline: assignmentModule.softDeadline,
    latestSubmission: latest
      ? {
          attemptNumber: latest.attemptNumber,
          bodyText: latest.bodyText,
          submittedAt: latest.submittedAt,
          isLate: latest.isLate,
          grade: latest.grade
            ? {
                label: latest.grade.label,
                feedback: latest.grade.feedback,
                gradedAt: latest.grade.gradedAt,
              }
            : null,
        }
      : null,
    canSubmit,
  };
}

/**
 * attemptNumber logic (see docs/plan.md's resubmission default): 1 if no
 * submission exists yet; the same attemptNumber (in-place edit) while the
 * latest submission is still ungraded; latest.attemptNumber + 1 only when
 * the latest was graded NEEDS_WORK and a retry slot remains; otherwise this
 * throws — a submission graded GOOD/EXCELLENT, or a NEEDS_WORK submission
 * that already used its retry, is final.
 */
export async function submitAssignment(input: {
  userId: string;
  assignmentModuleId: string;
  bodyText: string;
}): Promise<void> {
  const assignmentModule = await prisma.assignmentModule.findUniqueOrThrow({
    where: { moduleId: input.assignmentModuleId },
  });

  const latest = await prisma.submission.findFirst({
    where: { userId: input.userId, assignmentModuleId: input.assignmentModuleId },
    orderBy: { attemptNumber: 'desc' },
    include: { grade: true },
  });

  let attemptNumber: number;
  if (!latest) {
    attemptNumber = 1;
  } else if (!latest.grade) {
    attemptNumber = latest.attemptNumber;
  } else if (latest.grade.label === 'NEEDS_WORK' && latest.attemptNumber < MAX_ATTEMPTS) {
    attemptNumber = latest.attemptNumber + 1;
  } else {
    throw new AssignmentError(
      'This assignment has already been graded and can no longer be resubmitted.',
    );
  }

  const isLate = new Date() > assignmentModule.softDeadline;

  const submission = await prisma.submission.upsert({
    where: {
      userId_assignmentModuleId_attemptNumber: {
        userId: input.userId,
        assignmentModuleId: input.assignmentModuleId,
        attemptNumber,
      },
    },
    create: {
      userId: input.userId,
      assignmentModuleId: input.assignmentModuleId,
      attemptNumber,
      bodyText: input.bodyText,
      isLate,
    },
    update: { bodyText: input.bodyText, isLate, submittedAt: new Date() },
  });

  const courseVersionId = await getCourseVersionIdForModule(input.assignmentModuleId);
  await lockCourseVersionOnFirstActivity(courseVersionId);

  const cohortContext = await resolveUserCohortContext(input.userId, courseVersionId);
  if (cohortContext) {
    await awardAssignmentSubmitted({
      userId: input.userId,
      ...cohortContext,
      assignmentModuleId: input.assignmentModuleId,
      submissionId: submission.id,
      attemptNumber,
    });
  }
}

export async function gradeSubmission(input: {
  submissionId: string;
  organizationId: string;
  label: 'NEEDS_WORK' | 'GOOD' | 'EXCELLENT';
  feedback: string;
  gradedByUserId: string;
}): Promise<void> {
  await assertSubmissionInOrg(input.submissionId, input.organizationId);
  const submission = await prisma.submission.findUniqueOrThrow({
    where: { id: input.submissionId },
  });

  const grade = await prisma.grade.upsert({
    where: { submissionId: input.submissionId },
    create: {
      submissionId: input.submissionId,
      label: input.label,
      feedback: input.feedback,
      gradedByUserId: input.gradedByUserId,
    },
    update: { label: input.label, feedback: input.feedback, gradedByUserId: input.gradedByUserId },
  });

  const courseVersionId = await getCourseVersionIdForModule(submission.assignmentModuleId);
  const cohortContext = await resolveUserCohortContext(submission.userId, courseVersionId);
  if (cohortContext) {
    await awardAssignmentGraded({
      userId: submission.userId,
      ...cohortContext,
      assignmentModuleId: submission.assignmentModuleId,
      gradeId: grade.id,
    });

    // Notify the learner their assignment was graded, deep-linked to it.
    const mod = await prisma.module.findUnique({
      where: { id: submission.assignmentModuleId },
      select: { weekId: true, title: true },
    });
    const GRADE_WORD: Record<string, string> = {
      NEEDS_WORK: 'needs work',
      GOOD: 'good',
      EXCELLENT: 'excellent',
    };
    await prisma.notification.create({
      data: {
        userId: submission.userId,
        type: 'ASSIGNMENT_GRADED',
        title: 'Your assignment was graded',
        body: `${mod?.title ?? 'Assignment'} — ${GRADE_WORD[input.label] ?? input.label}`,
        linkUrl: mod?.weekId
          ? `/programs/${cohortContext.cohortId}/weeks/${mod.weekId}/assignment/${submission.assignmentModuleId}`
          : `/programs/${cohortContext.cohortId}`,
      },
    });
  }
}
