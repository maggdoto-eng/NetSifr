'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { createPost, addComment, DiscussionError } from '@/modules/community';

export type PostState = { error?: string; ok?: boolean } | undefined;

export async function createPostAction(
  cohortId: string,
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const { userId } = await verifySession();
  try {
    await createPost({ userId, cohortId, body: String(formData.get('body') ?? '') });
  } catch (e) {
    return { error: e instanceof DiscussionError ? e.message : 'Could not post.' };
  }
  revalidatePath(`/programs/${cohortId}/discussion`);
  return { ok: true };
}

export async function addCommentAction(
  cohortId: string,
  postId: string,
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const { userId } = await verifySession();
  try {
    await addComment({ userId, postId, body: String(formData.get('body') ?? '') });
  } catch (e) {
    return { error: e instanceof DiscussionError ? e.message : 'Could not reply.' };
  }
  revalidatePath(`/programs/${cohortId}/discussion/${postId}`);
  return { ok: true };
}
