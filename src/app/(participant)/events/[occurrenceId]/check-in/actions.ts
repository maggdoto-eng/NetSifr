'use server';

import { verifySession } from '@/lib/dal';
import { selfCheckIn, CheckInError } from '@/modules/events';

export type CheckInState = { status: 'idle' | 'success' | 'error'; message?: string };

/**
 * Check-in is a mutation, so it runs from an explicit button press (POST),
 * never during the page's GET render — otherwise a link-preview bot or a
 * router prefetch hitting the QR URL with the user's cookie would check them
 * in without them acting. The token is bound in from the page's query string.
 */
// Called by useActionState as (prevState, formData) with `token` bound in
// first; neither of those extra args is needed, so they're simply not
// declared (a shorter signature is assignable to the action type).
export async function checkInAction(token: string): Promise<CheckInState> {
  const { userId } = await verifySession();
  if (!token) return { status: 'error', message: 'This check-in link is missing its code.' };

  try {
    await selfCheckIn({ userId, checkInToken: token });
    return { status: 'success' };
  } catch (error) {
    if (error instanceof CheckInError) return { status: 'error', message: error.message };
    throw error;
  }
}
