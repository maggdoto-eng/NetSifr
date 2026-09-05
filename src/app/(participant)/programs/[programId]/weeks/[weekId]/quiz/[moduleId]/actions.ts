'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { submitQuizAttempt, QuizError } from '@/modules/learning';

export async function submitQuizAttemptAction(input: {
  moduleId: string;
  programId: string;
  weekId: string;
  answers: Array<{ questionId: string; selectedOptionId: string }>;
}): Promise<{ error?: string; scorePercent?: number }> {
  const { userId } = await verifySession();
  try {
    const result = await submitQuizAttempt({
      userId,
      quizModuleId: input.moduleId,
      answers: input.answers,
    });
    revalidatePath(`/programs/${input.programId}/weeks/${input.weekId}/quiz/${input.moduleId}`);
    revalidatePath(`/programs/${input.programId}`);
    return { scorePercent: result.scorePercent };
  } catch (error) {
    if (error instanceof QuizError) return { error: error.message };
    throw error;
  }
}
