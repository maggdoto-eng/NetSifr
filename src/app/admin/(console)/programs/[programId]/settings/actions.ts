'use server';

import { revalidatePath } from 'next/cache';
import {
  updateCohortSettings,
  updateCohortStatus,
} from '@/modules/learning';
import { requireAdminContext } from '@/app/admin/action-context';

export type SettingsState = { error?: string; saved?: boolean } | undefined;

export async function updateSettingsAction(
  cohortId: string,
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { userId, organizationId } = await requireAdminContext();

  const title = String(formData.get('title') ?? '');
  const cohortLabel = String(formData.get('cohortLabel') ?? '');
  const summary = String(formData.get('summary') ?? '');
  const attendanceUnlockMinutes = Number(formData.get('attendanceUnlockMinutes') ?? 10);

  try {
    await updateCohortSettings({
      cohortId,
      organizationId,
      actingUserId: userId,
      title,
      cohortLabel,
      summary,
      attendanceUnlockMinutes,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save settings.' };
  }

  revalidatePath(`/admin/programs/${cohortId}/settings`);
  revalidatePath('/admin/programs');
  return { saved: true };
}

export async function setStatusAction(
  cohortId: string,
  status: 'LIVE' | 'ARCHIVED' | 'DRAFT',
): Promise<void> {
  const { userId, organizationId } = await requireAdminContext();
  await updateCohortStatus({ cohortId, organizationId, actingUserId: userId, status });
  revalidatePath(`/admin/programs/${cohortId}/settings`);
  revalidatePath('/admin/programs');
}
