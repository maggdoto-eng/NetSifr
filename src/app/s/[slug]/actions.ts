'use server';

import { submitSurveyResponse, SurveyError } from '@/modules/surveys';
import type { Answers } from '@/lib/survey-schema';

export async function submitResponseAction(
  surveyId: string,
  data: { answers: Answers; complete: boolean },
): Promise<{ error?: string }> {
  try {
    await submitSurveyResponse({ surveyId, answers: data.answers, complete: data.complete });
    return {};
  } catch (e) {
    return { error: e instanceof SurveyError ? e.message : 'Could not submit your response.' };
  }
}
