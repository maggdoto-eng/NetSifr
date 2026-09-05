'use server';

import { revalidatePath } from 'next/cache';
import { verifyService } from '@/modules/volunteering';
import { requireAdminContext } from '@/app/admin/action-context';

export async function verifyServiceAction(input: {
  serviceLogId: string;
  status: 'VERIFIED' | 'REJECTED';
}): Promise<void> {
  const { userId, organizationId } = await requireAdminContext();
  await verifyService({
    serviceLogId: input.serviceLogId,
    organizationId,
    verifiedByUserId: userId,
    status: input.status,
  });
  revalidatePath('/admin/volunteering/service-logs');
}
