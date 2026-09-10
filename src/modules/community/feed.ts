import 'server-only';
import { prisma } from '@/lib/prisma';

export class CommunityError extends Error {}

async function requireOrgMember(userId: string, organizationId: string): Promise<void> {
  const m = await prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { status: true },
  });
  if (!m || m.status !== 'ACTIVE') throw new CommunityError('You’re not a member of this community.');
}

/** Org-wide community post (no cohort, audience COMMUNITY). */
export async function createCommunityPost(input: {
  userId: string;
  organizationId: string;
  body: string;
}): Promise<{ id: string }> {
  await requireOrgMember(input.userId, input.organizationId);
  const body = input.body.trim();
  if (!body) throw new CommunityError('Write something first.');
  if (body.length > 4000) throw new CommunityError('Keep it under 4000 characters.');
  return prisma.post.create({
    data: {
      cohortId: null,
      organizationId: input.organizationId,
      authorUserId: input.userId,
      audience: 'COMMUNITY',
      body,
    },
    select: { id: true },
  });
}

/** The org-wide community feed (not hidden), with reaction + reply counts. */
export async function getCommunityFeed(organizationId: string, userId: string, limit = 50) {
  return prisma.post.findMany({
    where: { organizationId, audience: 'COMMUNITY', hiddenAt: null },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      author: { select: { id: true, name: true, avatarKey: true } },
      reactions: { where: { userId }, select: { id: true } },
      _count: { select: { reactions: true, comments: true } },
    },
  });
}
