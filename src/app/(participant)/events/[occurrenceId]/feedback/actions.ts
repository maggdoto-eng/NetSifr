'use server';

import { verifySession } from '@/lib/dal';
import { submitFeedback, FeedbackError } from '@/modules/events';

export type SubmitFeedbackState = { error?: string; success?: boolean } | undefined;

export async function submitFeedbackAction(
  occurrenceId: string,
  _prevState: SubmitFeedbackState,
  formData: FormData,
): Promise<SubmitFeedbackState> {
  const { userId } = await verifySession();
  const rating = Number(formData.get('rating'));
  const comment = formData.get('comment')?.toString().trim() || undefined;

  try {
    await submitFeedback({ userId, eventOccurrenceId: occurrenceId, rating, comment });
  } catch (error) {
    if (error instanceof FeedbackError) return { error: error.message };
    throw error;
  }
  return { success: true };
}
