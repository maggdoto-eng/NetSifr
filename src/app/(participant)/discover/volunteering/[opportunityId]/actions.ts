'use server';

import { verifySession } from '@/lib/dal';
import {
  applyToOpportunity,
  withdrawApplication,
  getUserApplication,
  ApplicationError,
} from '@/modules/volunteering';

export type ApplyState = { error?: string; applied?: boolean } | undefined;

export async function applyAction(
  volunteerOpportunityId: string,
  _prevState: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const { userId } = await verifySession();
  const message = formData.get('message')?.toString().trim() || undefined;
  try {
    await applyToOpportunity({ userId, volunteerOpportunityId, message });
  } catch (error) {
    if (error instanceof ApplicationError) return { error: error.message };
    throw error;
  }
  return { applied: true };
}

export async function withdrawAction(volunteerOpportunityId: string): Promise<void> {
  const { userId } = await verifySession();
  const application = await getUserApplication(userId, volunteerOpportunityId);
  if (application) await withdrawApplication({ userId, applicationId: application.id });
}
