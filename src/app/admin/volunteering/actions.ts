'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createVolunteerOpportunity } from '@/modules/volunteering';
import { requireAdminContext } from '@/app/admin/action-context';
import { CreateVolunteerOpportunitySchema } from './schemas';

export type CreateVolunteerOpportunityState = { error?: string } | undefined;

export async function createVolunteerOpportunityAction(
  _prevState: CreateVolunteerOpportunityState,
  formData: FormData,
): Promise<CreateVolunteerOpportunityState> {
  const { userId, organizationId } = await requireAdminContext();

  const applyByRaw = formData.get('applyByDate');
  const parsed = CreateVolunteerOpportunitySchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    locationMode: formData.get('locationMode'),
    applyByDate: applyByRaw ? applyByRaw : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  const { volunteerOpportunityId } = await createVolunteerOpportunity({
    organizationId,
    ownerUserId: userId,
    title: parsed.data.title,
    description: parsed.data.description,
    locationMode: parsed.data.locationMode,
    applyByDate: parsed.data.applyByDate ? new Date(parsed.data.applyByDate) : undefined,
  });

  revalidatePath('/admin/volunteering');
  redirect(`/admin/volunteering/${volunteerOpportunityId}`);
}
