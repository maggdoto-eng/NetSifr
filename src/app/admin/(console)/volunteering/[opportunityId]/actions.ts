'use server';

import { revalidatePath } from 'next/cache';
import { addShift, updateVolunteerOpportunityStatus } from '@/modules/volunteering';
import { requireAdminContext } from '@/app/admin/action-context';
import { CreateShiftSchema } from '../schemas';

export type CreateShiftState = { error?: string } | undefined;

export async function addShiftAction(
  opportunityId: string,
  _prevState: CreateShiftState,
  formData: FormData,
): Promise<CreateShiftState> {
  const { organizationId } = await requireAdminContext();

  const capacityRaw = formData.get('capacity');
  const parsed = CreateShiftSchema.safeParse({
    title: formData.get('title'),
    startsAt: formData.get('startsAt'),
    endsAt: formData.get('endsAt'),
    capacity: capacityRaw ? capacityRaw : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  await addShift({
    volunteerOpportunityId: opportunityId,
    organizationId,
    title: parsed.data.title,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    capacity: parsed.data.capacity,
  });

  revalidatePath(`/admin/volunteering/${opportunityId}`);
  return undefined;
}

async function setStatus(opportunityId: string, status: 'OPEN' | 'CLOSED' | 'ARCHIVED') {
  const { userId, organizationId } = await requireAdminContext();
  await updateVolunteerOpportunityStatus({
    volunteerOpportunityId: opportunityId,
    organizationId,
    actingUserId: userId,
    status,
  });
  revalidatePath(`/admin/volunteering/${opportunityId}`);
  revalidatePath('/admin/volunteering');
}

export async function openOpportunityAction(opportunityId: string) {
  await setStatus(opportunityId, 'OPEN');
}

export async function closeOpportunityAction(opportunityId: string) {
  await setStatus(opportunityId, 'CLOSED');
}

export async function archiveOpportunityAction(opportunityId: string) {
  await setStatus(opportunityId, 'ARCHIVED');
}
