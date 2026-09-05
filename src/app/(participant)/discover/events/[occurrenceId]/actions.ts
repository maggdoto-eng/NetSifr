'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { getDefaultOrganization } from '@/lib/org';
import {
  registerForOccurrence,
  cancelRegistration,
  getUserRegistration,
  RegistrationError,
} from '@/modules/events';

export async function registerAction(
  occurrenceId: string,
): Promise<{ error?: string; status?: 'REGISTERED' | 'WAITLISTED' }> {
  const { userId } = await verifySession();
  const org = await getDefaultOrganization();

  try {
    const result = await registerForOccurrence({
      userId,
      eventOccurrenceId: occurrenceId,
      organizationId: org.id,
    });
    revalidatePath(`/discover/events/${occurrenceId}`);
    revalidatePath('/discover');
    revalidatePath('/events');
    return { status: result.status };
  } catch (error) {
    if (error instanceof RegistrationError) return { error: error.message };
    throw error;
  }
}

export async function cancelRegistrationAction(occurrenceId: string): Promise<void> {
  const { userId } = await verifySession();
  const registration = await getUserRegistration(userId, occurrenceId);
  if (registration) {
    await cancelRegistration(registration.id);
  }
  revalidatePath(`/discover/events/${occurrenceId}`);
  revalidatePath('/discover');
  revalidatePath('/events');
}
