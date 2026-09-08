'use server';

import { revalidatePath } from 'next/cache';
import { updateApplicationStatus } from '@/modules/volunteering';
import { requireAdminContext } from '@/app/admin/action-context';

export async function decideApplicationAction(input: {
  opportunityId: string;
  applicationId: string;
  status: 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED';
}): Promise<void> {
  const { userId, organizationId } = await requireAdminContext();
  await updateApplicationStatus({
    applicationId: input.applicationId,
    organizationId,
    actingUserId: userId,
    status: input.status,
  });
  revalidatePath(`/admin/volunteering/${input.opportunityId}/applications`);
}
