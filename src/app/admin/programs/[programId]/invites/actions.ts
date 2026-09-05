'use server';

import { revalidatePath } from 'next/cache';
import { generateInvitation } from '@/modules/learning';
import { requireAdminContext } from '@/app/admin/action-context';
import { z } from 'zod';

const EmailSchema = z.email({ error: 'Enter a valid email.' }).trim();

export type GenerateInviteState = { error?: string; url?: string } | undefined;

export async function generateInviteAction(
  cohortId: string,
  _prevState: GenerateInviteState,
  formData: FormData,
): Promise<GenerateInviteState> {
  const { userId, organizationId } = await requireAdminContext();

  const parsed = EmailSchema.safeParse(formData.get('email'));
  if (!parsed.success) {
    return { error: 'Enter a valid email.' };
  }

  try {
    const { url } = await generateInvitation({
      cohortId,
      organizationId,
      email: parsed.data,
      createdByUserId: userId,
    });
    revalidatePath(`/admin/programs/${cohortId}/invites`);
    return { url };
  } catch {
    return { error: 'Could not send the invite email — check the email provider configuration.' };
  }
}
