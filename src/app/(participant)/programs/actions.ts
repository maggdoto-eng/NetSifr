'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { acceptInvitationById, declineInvitationById } from '@/modules/learning';

export async function acceptInvitationAction(invitationId: string): Promise<void> {
  const { userId } = await verifySession();
  await acceptInvitationById({ invitationId, userId });
  revalidatePath('/programs');
}

export async function declineInvitationAction(invitationId: string): Promise<void> {
  const { userId } = await verifySession();
  await declineInvitationById({ invitationId, userId });
  revalidatePath('/programs');
}
