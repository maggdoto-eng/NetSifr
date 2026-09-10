'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { getDefaultOrganization } from '@/lib/org';
import {
  toggleReaction,
  toggleFollow,
  reportPost,
  createCommunityPost,
  CommunityError,
} from '@/modules/community';

export async function likeAction(postId: string): Promise<{ liked: boolean }> {
  const { userId } = await verifySession();
  const liked = await toggleReaction(userId, postId);
  return { liked };
}

export async function followAction(followeeUserId: string): Promise<{ following: boolean }> {
  const { userId } = await verifySession();
  const following = await toggleFollow(userId, followeeUserId);
  return { following };
}

export async function reportAction(postId: string, reason: string): Promise<{ ok: boolean }> {
  const { userId } = await verifySession();
  await reportPost({ reporterUserId: userId, postId, reason });
  return { ok: true };
}

export type CommunityPostState = { error?: string; ok?: boolean } | undefined;

export async function communityPostAction(
  _prev: CommunityPostState,
  formData: FormData,
): Promise<CommunityPostState> {
  const { userId } = await verifySession();
  const org = await getDefaultOrganization();
  try {
    await createCommunityPost({ userId, organizationId: org.id, body: String(formData.get('body') ?? '') });
  } catch (e) {
    return { error: e instanceof CommunityError ? e.message : 'Could not post.' };
  }
  revalidatePath('/community');
  return { ok: true };
}
