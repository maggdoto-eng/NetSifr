import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  startPlaybackSession,
  recordHeartbeat,
  markAttended,
  markReadingDone,
  submitQuizAttempt,
  submitAssignment,
  gradeSubmission,
} from '@/modules/learning';
import { getCohortPoints, getCohortStreak, getTotalPoints } from '@/modules/recognition';
import {
  createTestOrg,
  createTestAdmin,
  createTestUser,
  createLiveCohortWithModules,
  enrolUser,
  cleanupOrg,
} from '../support/fixtures';

/**
 * Point values are ported directly from the Claude Design prototype's
 * points() reducer (see src/modules/recognition/points.ts's doc comment):
 * attendance +100, reading +40, quiz +round(score*1.5) for the BEST of the
 * 2 attempts only, assignment +80 on first submission and +60 the first
 * time it's ever graded (any label, and never again on a re-grade).
 */
describe('ContributionEvent ledger (points/streak)', () => {
  let orgId: string;
  let adminUserId: string;
  let userId: string;
  let cohortId: string;
  let recordingModuleId: string;
  let readingModuleId: string;
  let quizModuleId: string;
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
    cohortId = cohort.cohortId;
    recordingModuleId = cohort.recordingModuleId;
    readingModuleId = cohort.readingModuleId;
    quizModuleId = cohort.quizModuleId;
    assignmentModuleId = cohort.assignmentModuleId;
    await prisma.recordingModule.update({
      where: { moduleId: recordingModuleId },
      data: { unlockMinutesOverride: 0 },
    });

    const participant = await createTestUser('Points Tester');
    userId = participant.userId;
    userIds.push(userId);
    await enrolUser({ cohortId, userId, email: participant.email, createdByUserId: adminUserId });
  });

  afterAll(async () => {
    await cleanupOrg(orgId, userIds);
  });

  it('awards 100 points and 1 streak for a confirmed attendance', async () => {
    const { nonce } = await startPlaybackSession(userId, recordingModuleId);
    await recordHeartbeat({ userId, recordingModuleId, nonce, deltaSeconds: 5 });
    await markAttended(userId, recordingModuleId);

    expect(await getCohortPoints(userId, cohortId)).toBe(100);
    expect(await getCohortStreak(userId, cohortId)).toBe(1);
  });

  it('is idempotent — re-confirming the same recording never double-awards', async () => {
    await markAttended(userId, recordingModuleId); // already confirmed; markAttended returns early
    expect(await getCohortPoints(userId, cohortId)).toBe(100);
  });

  it('awards 40 points for reading completion', async () => {
    await markReadingDone(userId, readingModuleId);
    expect(await getCohortPoints(userId, cohortId)).toBe(140);
  });

  it('awards round(scorePercent * 1.5) for a quiz, keeping only the best of 2 attempts', async () => {
    const questions = await prisma.quizQuestion.findMany({
      where: { quizModuleId },
      include: { options: true },
    });
    const [q1, q2] = questions;
    const wrong1 = q1.options.find((o) => !o.isCorrect)!;
    const correct1 = q1.options.find((o) => o.isCorrect)!;
    const correct2 = q2.options.find((o) => o.isCorrect)!;

    // Attempt 1: 1/2 correct = 50% -> +75.
    await submitQuizAttempt({
      userId,
      quizModuleId,
      answers: [
        { questionId: q1.id, selectedOptionId: wrong1.id },
        { questionId: q2.id, selectedOptionId: correct2.id },
      ],
    });
    expect(await getCohortPoints(userId, cohortId)).toBe(140 + 75);

    // Attempt 2: 2/2 correct = 100% -> replaces the 75 with 150 (best attempt wins).
    await submitQuizAttempt({
      userId,
      quizModuleId,
      answers: [
        { questionId: q1.id, selectedOptionId: correct1.id },
        { questionId: q2.id, selectedOptionId: correct2.id },
      ],
    });
    expect(await getCohortPoints(userId, cohortId)).toBe(140 + 150);
  });

  it('awards 80 on first submission and 60 on the first grade only — resubmission and re-grading award nothing further', async () => {
    const base = await getCohortPoints(userId, cohortId);

    await submitAssignment({ userId, assignmentModuleId, bodyText: 'Draft one.' });
    expect(await getCohortPoints(userId, cohortId)).toBe(base + 80);

    const submission1 = await prisma.submission.findFirstOrThrow({
      where: { userId, assignmentModuleId, attemptNumber: 1 },
    });
    await gradeSubmission({
      submissionId: submission1.id,
      organizationId: orgId,
      label: 'NEEDS_WORK',
      feedback: 'Add specifics.',
      gradedByUserId: adminUserId,
    });
    expect(await getCohortPoints(userId, cohortId)).toBe(base + 80 + 60);

    // Resubmission (attempt 2, allowed after NEEDS_WORK) awards no further submission points.
    await submitAssignment({ userId, assignmentModuleId, bodyText: 'Draft two.' });
    expect(await getCohortPoints(userId, cohortId)).toBe(base + 80 + 60);

    // Re-grading (even to a different label) awards no further grading points.
    const submission2 = await prisma.submission.findFirstOrThrow({
      where: { userId, assignmentModuleId, attemptNumber: 2 },
    });
    await gradeSubmission({
      submissionId: submission2.id,
      organizationId: orgId,
      label: 'GOOD',
      feedback: 'Much better.',
      gradedByUserId: adminUserId,
    });
    expect(await getCohortPoints(userId, cohortId)).toBe(base + 80 + 60);
  });

  it('getTotalPoints sums across every cohort the user is in', async () => {
    const totalBefore = await getTotalPoints(userId);
    expect(totalBefore).toBe(await getCohortPoints(userId, cohortId));

    const secondCohort = await createLiveCohortWithModules({
      organizationId: orgId,
      ownerUserId: adminUserId,
    });
    const credential = await prisma.credential.findFirstOrThrow({
      where: { userId, type: 'EMAIL_PASSWORD' },
    });
    await enrolUser({
      cohortId: secondCohort.cohortId,
      userId,
      email: credential.identifier,
      createdByUserId: adminUserId,
    });
    await markReadingDone(userId, secondCohort.readingModuleId);

    const totalAfter = await getTotalPoints(userId);
    expect(totalAfter).toBe(totalBefore + 40);
  });
});
