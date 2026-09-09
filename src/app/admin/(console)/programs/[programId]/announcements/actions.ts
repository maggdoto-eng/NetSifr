'use server';

import { revalidatePath } from 'next/cache';
import { postAnnouncement } from '@/modules/communications';
import { requireAdminContext } from '@/app/admin/action-context';

export type AnnounceState = { error?: string; posted?: boolean } | undefined;

export async function postAnnouncementAction(
  cohortId: string,
  _prev: AnnounceState,
  formData: FormData,
): Promise<AnnounceState> {
  const { userId, organizationId } = await requireAdminContext();
  const title = String(formData.get('title') ?? '');
  const body = String(formData.get('body') ?? '');
  try {
    await postAnnouncement({ cohortId, organizationId, authorUserId: userId, title, body });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not post the announcement.' };
  }
  revalidatePath(`/admin/programs/${cohortId}/announcements`);
  return { posted: true };
}
