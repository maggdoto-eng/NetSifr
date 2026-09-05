import 'server-only';
import { prisma } from '@/lib/prisma';
import {
  lockCourseVersionOnFirstActivity,
  getCourseVersionIdForModule,
  resolveUserCohortContext,
} from './course-version';
import { awardQuizScored } from '@/modules/recognition';

export class QuizError extends Error {}

const MAX_ATTEMPTS = 2;

export type QuizForTaking = {
  quizModuleId: string;
  title: string;
  attemptsUsed: number;
  attemptsRemaining: number;
  bestScorePercent: number | null;
  questions: Array<{
    id: string;
    prompt: string;
    options: Array<{ id: string; label: string }>;
  }>;
  /** Only populated once the learner has at least one attempt — never leaked beforehand. */
  correctOptionIdByQuestionId: Record<string, string> | null;
  latestAttempt: {
    attemptNumber: number;
    scorePercent: number;
    answers: Array<{ questionId: string; selectedOptionId: string }>;
  } | null;
};

export async function getQuizForTaking(
  userId: string,
  quizModuleId: string,
): Promise<QuizForTaking> {
  const quizModule = await prisma.quizModule.findUniqueOrThrow({
    where: { moduleId: quizModuleId },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { options: { orderBy: { orderIndex: 'asc' } } },
      },
    },
  });

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, quizModuleId },
    orderBy: { attemptNumber: 'asc' },
    include: { answers: true },
  });

  const hasAttempted = attempts.length > 0;
  const latest = attempts.at(-1);

  return {
    quizModuleId,
    title: quizModule.title,
    attemptsUsed: attempts.length,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts.length),
    bestScorePercent: hasAttempted ? Math.max(...attempts.map((a) => a.scorePercent)) : null,
    questions: quizModule.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options.map((o) => ({ id: o.id, label: o.label })),
    })),
    correctOptionIdByQuestionId: hasAttempted
      ? Object.fromEntries(
          quizModule.questions.map((q) => [q.id, q.options.find((o) => o.isCorrect)!.id]),
        )
      : null,
    latestAttempt: latest
      ? {
          attemptNumber: latest.attemptNumber,
          scorePercent: latest.scorePercent,
          answers: latest.answers.map((a) => ({
            questionId: a.questionId,
            selectedOptionId: a.selectedOptionId,
          })),
        }
      : null,
  };
}

/** Server-side scored — a submitted selectedOptionId is only ever compared against isCorrect, never trusted as a score. */
export async function submitQuizAttempt(input: {
  userId: string;
  quizModuleId: string;
  answers: Array<{ questionId: string; selectedOptionId: string }>;
}): Promise<{ scorePercent: number; attemptNumber: number }> {
  const priorCount = await prisma.quizAttempt.count({
    where: { userId: input.userId, quizModuleId: input.quizModuleId },
  });
  if (priorCount >= MAX_ATTEMPTS) {
    throw new QuizError("You've used both attempts for this quiz.");
  }

  const questions = await prisma.quizQuestion.findMany({
    where: { quizModuleId: input.quizModuleId },
    include: { options: true },
  });
  if (questions.length === 0) {
    throw new QuizError('This quiz has no questions yet.');
  }

  const selectedByQuestionId = new Map(
    input.answers.map((a) => [a.questionId, a.selectedOptionId]),
  );
  let correctCount = 0;
  const answerRows: Array<{ questionId: string; selectedOptionId: string }> = [];

  for (const question of questions) {
    const selectedOptionId = selectedByQuestionId.get(question.id);
    const selectedOption = question.options.find((o) => o.id === selectedOptionId);
    if (!selectedOption) continue; // unanswered — counts wrong, no answer row written
    answerRows.push({ questionId: question.id, selectedOptionId: selectedOption.id });
    if (selectedOption.isCorrect) correctCount++;
  }

  const scorePercent = Math.round((correctCount / questions.length) * 100);
  const attemptNumber = priorCount + 1;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: input.userId,
      quizModuleId: input.quizModuleId,
      attemptNumber,
      scorePercent,
      answers: { create: answerRows },
    },
  });

  const courseVersionId = await getCourseVersionIdForModule(input.quizModuleId);
  await lockCourseVersionOnFirstActivity(courseVersionId);

  const cohortContext = await resolveUserCohortContext(input.userId, courseVersionId);
  if (cohortContext) {
    await awardQuizScored({
      userId: input.userId,
      ...cohortContext,
      quizModuleId: input.quizModuleId,
      scorePercent,
      attemptId: attempt.id,
    });
  }

  return { scorePercent, attemptNumber };
}
