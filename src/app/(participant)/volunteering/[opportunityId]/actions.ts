'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import {
  signUpForShift,
  cancelSignup,
  logService,
  ShiftError,
  ServiceLogError,
} from '@/modules/volunteering';

export async function signUpAction(opportunityId: string, shiftId: string): Promise<void> {
  const { userId } = await verifySession();
  await signUpForShift({ userId, shiftId });
  revalidatePath(`/volunteering/${opportunityId}`);
}

export async function cancelSignupAction(opportunityId: string, signupId: string): Promise<void> {
  const { userId } = await verifySession();
  await cancelSignup({ userId, signupId });
  revalidatePath(`/volunteering/${opportunityId}`);
}

export type LogHoursState = { error?: string; logged?: boolean } | undefined;

export async function logHoursAction(
  opportunityId: string,
  _prevState: LogHoursState,
  formData: FormData,
): Promise<LogHoursState> {
  const { userId } = await verifySession();
  const hours = Number(formData.get('hours'));
  const occurredOnRaw = formData.get('occurredOn')?.toString();
  const note = formData.get('note')?.toString().trim() || undefined;
  const shiftId = formData.get('shiftId')?.toString() || undefined;

  if (!occurredOnRaw) return { error: 'Pick the date you volunteered.' };

  try {
    await logService({
      userId,
      volunteerOpportunityId: opportunityId,
      shiftId,
      hours,
      note,
      occurredOn: new Date(occurredOnRaw),
    });
  } catch (error) {
    if (error instanceof ServiceLogError || error instanceof ShiftError) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath(`/volunteering/${opportunityId}`);
  return { logged: true };
}
