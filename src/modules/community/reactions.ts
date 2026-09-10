import 'server-only';
import { prisma } from '@/lib/prisma';

/** Like/unlike a post. Returns the new liked state. */
export async function toggleReaction(userId: string, postId: string): Promise<boolean> {
  const existing = await prisma.reaction.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.reaction.create({ data: { postId, userId } });
  return true;
}
