'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { markReadingDone } from '@/modules/learning';

export async function markReadingDoneAction(input: {
  moduleId: string;
  programId: string;
  weekId: string;
}): Promise<void> {
  const { userId } = await verifySession();
  await markReadingDone(userId, input.moduleId);
  revalidatePath(`/programs/${input.programId}/weeks/${input.weekId}/reading/${input.moduleId}`);
  revalidatePath(`/programs/${input.programId}`);
}
