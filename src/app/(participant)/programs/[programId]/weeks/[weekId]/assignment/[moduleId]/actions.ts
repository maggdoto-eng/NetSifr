'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { submitAssignment, AssignmentError } from '@/modules/learning';

export async function submitAssignmentAction(input: {
  moduleId: string;
  programId: string;
  weekId: string;
  bodyText: string;
}): Promise<{ error?: string }> {
  const { userId } = await verifySession();
  try {
    await submitAssignment({
      userId,
      assignmentModuleId: input.moduleId,
      bodyText: input.bodyText,
    });
  } catch (error) {
    if (error instanceof AssignmentError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/programs/${input.programId}/weeks/${input.weekId}/assignment/${input.moduleId}`);
  revalidatePath(`/programs/${input.programId}`);
  return {};
}
