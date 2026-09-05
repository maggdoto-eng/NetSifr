import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getQuizForTaking, submitQuizAttempt, QuizError } from '@/modules/learning';
import {
  createTestOrg,
  createTestAdmin,
  createTestUser,
  createLiveCohortWithModules,
  enrolUser,
  cleanupOrg,
} from '../support/fixtures';

describe('quiz scoring and attempt limits', () => {
  let orgId: string;
  let adminUserId: string;
  let cohortId: string;
  let userId: string;
  let quizModuleId: string;
  let correctOptionIds: Record<string, string>;
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
    quizModuleId = cohort.quizModuleId;

    const participant = await createTestUser('Quiz Taker');
    userId = participant.userId;
    userIds.push(userId);
    await enrolUser({
      cohortId,
      userId,
      email: participant.email,
      createdByUserId: adminUserId,
    });

    const questions = await prisma.quizQuestion.findMany({
      where: { quizModuleId },
      include: { options: true },
    });
    correctOptionIds = Object.fromEntries(
      questions.map((q) => [q.id, q.options.find((o) => o.isCorrect)!.id]),
    );
  });

  afterAll(async () => {
    await cleanupOrg(orgId, userIds);
  });

  it('scores server-side from submitted option ids, never trusting a client score', async () => {
    const questionIds = Object.keys(correctOptionIds);
    const wrongOptionId = (
      await prisma.quizQuestion.findUniqueOrThrow({
        where: { id: questionIds[0] },
        include: { options: true },
      })
    ).options.find((o) => o.id !== correctOptionIds[questionIds[0]])!.id;

    const result = await submitQuizAttempt({
      userId,
      quizModuleId,
      answers: [
        { questionId: questionIds[0], selectedOptionId: wrongOptionId },
        { questionId: questionIds[1], selectedOptionId: correctOptionIds[questionIds[1]] },
      ],
    });

    expect(result.scorePercent).toBe(50);
    expect(result.attemptNumber).toBe(1);
  });

  it('counts an unanswered question as wrong rather than throwing', async () => {
    const taking = await getQuizForTaking(userId, quizModuleId);
    // Attempt 1 already used above — this is attempt 2 (the last allowed).
    const questionIds = Object.keys(correctOptionIds);
    const result = await submitQuizAttempt({
      userId,
      quizModuleId,
      answers: [{ questionId: questionIds[0], selectedOptionId: correctOptionIds[questionIds[0]] }],
    });
    expect(result.scorePercent).toBe(50);
    expect(taking.attemptsRemaining).toBe(1);
  });

  it('rejects a third attempt once the 2-attempt cap is reached', async () => {
    const questionIds = Object.keys(correctOptionIds);
    await expect(
      submitQuizAttempt({
        userId,
        quizModuleId,
        answers: [
          { questionId: questionIds[0], selectedOptionId: correctOptionIds[questionIds[0]] },
        ],
      }),
    ).rejects.toThrow(QuizError);
  });

  it('only reveals correct answers once the learner has at least one attempt', async () => {
    const { userId: freshUserId, email } = await createTestUser('Fresh Quiz Taker');
    userIds.push(freshUserId);
    await enrolUser({
      cohortId,
      userId: freshUserId,
      email,
      createdByUserId: adminUserId,
    });

    const before = await getQuizForTaking(freshUserId, quizModuleId);
    expect(before.correctOptionIdByQuestionId).toBeNull();

    const questionIds = Object.keys(correctOptionIds);
    await submitQuizAttempt({
      userId: freshUserId,
      quizModuleId,
      answers: [{ questionId: questionIds[0], selectedOptionId: correctOptionIds[questionIds[0]] }],
    });

    const after = await getQuizForTaking(freshUserId, quizModuleId);
    expect(after.correctOptionIdByQuestionId).not.toBeNull();
  });
});
