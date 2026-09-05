import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  getAssignmentForTaking,
  submitAssignment,
  gradeSubmission,
  AssignmentError,
} from '@/modules/learning';
import {
  createTestOrg,
  createTestAdmin,
  createTestUser,
  createLiveCohortWithModules,
  enrolUser,
  cleanupOrg,
} from '../support/fixtures';

describe('assignment resubmission and grading rules', () => {
  let orgId: string;
  let adminUserId: string;
  let userId: string;
  let assignmentModuleId: string;
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
    assignmentModuleId = cohort.assignmentModuleId;

    const participant = await createTestUser('Assignment Submitter');
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

  it('creates attempt 1 on first submission', async () => {
    await submitAssignment({ userId, assignmentModuleId, bodyText: 'Draft one.' });
    const taking = await getAssignmentForTaking(userId, assignmentModuleId);
    expect(taking.latestSubmission?.attemptNumber).toBe(1);
    expect(taking.canSubmit).toBe(true);
  });

  it('edits attempt 1 in place while it is still ungraded, not creating attempt 2', async () => {
    await submitAssignment({ userId, assignmentModuleId, bodyText: 'Draft one, revised.' });
    const taking = await getAssignmentForTaking(userId, assignmentModuleId);
    expect(taking.latestSubmission?.attemptNumber).toBe(1);
    expect(taking.latestSubmission?.bodyText).toBe('Draft one, revised.');
  });

  it('blocks further submission once graded GOOD/EXCELLENT', async () => {
    const submission = await prisma.submission.findFirstOrThrow({
      where: { userId, assignmentModuleId },
    });
    await gradeSubmission({
      submissionId: submission.id,
      organizationId: orgId,
      label: 'GOOD',
      feedback: 'Solid work.',
      gradedByUserId: adminUserId,
    });

    const taking = await getAssignmentForTaking(userId, assignmentModuleId);
    expect(taking.canSubmit).toBe(false);
    await expect(
      submitAssignment({ userId, assignmentModuleId, bodyText: 'Trying again.' }),
    ).rejects.toThrow(AssignmentError);
  });

  it('grants exactly one resubmission after a NEEDS_WORK grade, then blocks a further attempt', async () => {
    const { userId: needsWorkUserId, email } = await createTestUser('Needs Work Submitter');
    userIds.push(needsWorkUserId);
    const cohortRow = await prisma.assignmentModule.findUniqueOrThrow({
      where: { moduleId: assignmentModuleId },
      include: { module: { include: { week: true } } },
    });
    const cohort = await prisma.cohort.findFirstOrThrow({
      where: { courseVersionId: cohortRow.module.week.courseVersionId },
    });
    await enrolUser({
      cohortId: cohort.id,
      userId: needsWorkUserId,
      email,
      createdByUserId: adminUserId,
    });

    // Attempt 1, graded NEEDS_WORK.
    await submitAssignment({ userId: needsWorkUserId, assignmentModuleId, bodyText: 'First try.' });
    const attempt1 = await prisma.submission.findFirstOrThrow({
      where: { userId: needsWorkUserId, assignmentModuleId, attemptNumber: 1 },
    });
    await gradeSubmission({
      submissionId: attempt1.id,
      organizationId: orgId,
      label: 'NEEDS_WORK',
      feedback: 'Add detail.',
      gradedByUserId: adminUserId,
    });

    let taking = await getAssignmentForTaking(needsWorkUserId, assignmentModuleId);
    expect(taking.canSubmit).toBe(true);

    // Attempt 2 (the one allowed retry), graded NEEDS_WORK again.
    await submitAssignment({
      userId: needsWorkUserId,
      assignmentModuleId,
      bodyText: 'Second try.',
    });
    const attempt2 = await prisma.submission.findFirstOrThrow({
      where: { userId: needsWorkUserId, assignmentModuleId, attemptNumber: 2 },
    });
    expect(attempt2.bodyText).toBe('Second try.');
    await gradeSubmission({
      submissionId: attempt2.id,
      organizationId: orgId,
      label: 'NEEDS_WORK',
      feedback: 'Still needs work.',
      gradedByUserId: adminUserId,
    });

    taking = await getAssignmentForTaking(needsWorkUserId, assignmentModuleId);
    expect(taking.canSubmit).toBe(false);
    await expect(
      submitAssignment({ userId: needsWorkUserId, assignmentModuleId, bodyText: 'Third try.' }),
    ).rejects.toThrow(AssignmentError);
  });
});
