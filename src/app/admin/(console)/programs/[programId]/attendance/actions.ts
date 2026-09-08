'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext } from '@/app/admin/action-context';
import { overrideAttendance } from '@/modules/learning';

export async function overrideAttendanceAction(
  input: { cohortId: string; userId: string; recordingModuleId: string },
  formData: FormData,
): Promise<void> {
  const { userId: adminUserId, organizationId } = await requireAdminContext();
  const note = formData.get('note')?.toString().trim() || undefined;

  await overrideAttendance({
    userId: input.userId,
    recordingModuleId: input.recordingModuleId,
    organizationId,
    overriddenByUserId: adminUserId,
    note,
  });

  revalidatePath(`/admin/programs/${input.cohortId}/attendance`);
}
