'use server';

import { revalidatePath } from 'next/cache';
import { adminCheckIn } from '@/modules/events';
import { requireAdminContext } from '@/app/admin/action-context';

export async function adminCheckInAction(input: {
  eventId: string;
  occurrenceId: string;
  userId: string;
}): Promise<void> {
  const { userId: adminUserId, organizationId } = await requireAdminContext();
  await adminCheckIn({
    userId: input.userId,
    eventOccurrenceId: input.occurrenceId,
    organizationId,
    checkedInByUserId: adminUserId,
  });
  revalidatePath(`/admin/events/${input.eventId}/occurrences/${input.occurrenceId}/registrations`);
}
