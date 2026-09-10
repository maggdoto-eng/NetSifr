import 'server-only';
import { prisma } from '@/lib/prisma';

export async function toggleFollow(followerId: string, followeeId: string): Promise<boolean> {
  if (followerId === followeeId) return false;
  const existing = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId, followeeId } },
  });
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.follow.create({ data: { followerId, followeeId } });
  return true;
}

/** Which of the given user ids the viewer already follows. */
export async function getFollowingSet(followerId: string, followeeIds: string[]): Promise<Set<string>> {
  if (followeeIds.length === 0) return new Set();
  const rows = await prisma.follow.findMany({
    where: { followerId, followeeId: { in: followeeIds } },
    select: { followeeId: true },
  });
  return new Set(rows.map((r) => r.followeeId));
}
