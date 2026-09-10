'use server';

import { revalidatePath } from 'next/cache';
import { hidePostFromReport, dismissReport } from '@/modules/community';
import { requireAdminContext } from '@/app/admin/action-context';

export async function hideReportAction(reportId: string): Promise<void> {
  const { organizationId } = await requireAdminContext();
  await hidePostFromReport({ reportId, organizationId });
  revalidatePath('/admin/moderation');
}

export async function dismissReportAction(reportId: string): Promise<void> {
  const { organizationId } = await requireAdminContext();
  await dismissReport({ reportId, organizationId });
  revalidatePath('/admin/moderation');
}
