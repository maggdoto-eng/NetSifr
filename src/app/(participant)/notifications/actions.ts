'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { markAllNotificationsRead } from '@/modules/communications';

export async function markAllReadAction(): Promise<void> {
  const { userId } = await verifySession();
  await markAllNotificationsRead(userId);
  revalidatePath('/notifications');
  revalidatePath('/', 'layout'); // refresh the bell count in the shell
}
