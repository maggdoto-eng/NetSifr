'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { startPlaybackSession, markAttended, AttendanceError } from '@/modules/learning';

export async function startPlaybackSessionAction(
  recordingModuleId: string,
): Promise<{ nonce: string }> {
  const { userId } = await verifySession();
  return startPlaybackSession(userId, recordingModuleId);
}

export async function markAttendedAction(input: {
  recordingModuleId: string;
  programId: string;
  weekId: string;
}): Promise<{ error?: string }> {
  const { userId } = await verifySession();
  try {
    await markAttended(userId, input.recordingModuleId);
  } catch (error) {
    if (error instanceof AttendanceError) return { error: error.message };
    throw error;
  }
  revalidatePath(
    `/programs/${input.programId}/weeks/${input.weekId}/recording/${input.recordingModuleId}`,
  );
  revalidatePath(`/programs/${input.programId}`);
  return {};
}
