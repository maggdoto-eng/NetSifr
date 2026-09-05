import 'server-only';
import { prisma } from '@/lib/prisma';

/**
 * Option position -> persona key, for all three persona quiz questions
 * (each question's options are authored in this same order). This is the
 * one place that mapping lives — the onboarding UI only needs to know
 * question/option text, not which persona an option maps to.
 */
const PERSONA_KEYS_IN_ORDER = [
  'policy-navigator',
  'ground-organizer',
  'narrative-builder',
] as const;

/** Majority vote over 3 answers (0-2 each), ties broken toward the lowest index — matches the original prototype's Array.indexOf(max) semantics. */
export function computePersonaIndex(answers: number[]): number {
  const counts = [0, 0, 0];
  for (const answer of answers) {
    if (answer >= 0 && answer <= 2) counts[answer]++;
  }
  return counts.indexOf(Math.max(...counts));
}

export class OnboardingError extends Error {}

export async function completeOnboarding(input: {
  userId: string;
  name: string;
  avatarKey: number;
  personaAnswers: number[];
  topicIds: string[];
}): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new OnboardingError('Enter your name.');
  if (input.personaAnswers.length !== 3 || input.personaAnswers.some((a) => a < 0 || a > 2)) {
    throw new OnboardingError('Answer all three persona questions.');
  }

  const personaIndex = computePersonaIndex(input.personaAnswers);
  const persona = await prisma.persona.findUniqueOrThrow({
    where: { key: PERSONA_KEYS_IN_ORDER[personaIndex] },
  });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { name, avatarKey: input.avatarKey, personaId: persona.id, onboardedAt: new Date() },
    });

    await tx.personaQuizAnswer.deleteMany({ where: { userId: input.userId } });
    await tx.personaQuizAnswer.createMany({
      data: input.personaAnswers.map((optionIndex, questionIndex) => ({
        userId: input.userId,
        questionIndex,
        optionIndex,
      })),
    });

    await tx.userTopic.deleteMany({ where: { userId: input.userId } });
    if (input.topicIds.length > 0) {
      await tx.userTopic.createMany({
        data: input.topicIds.map((topicId) => ({ userId: input.userId, topicId })),
      });
    }
  });
}
