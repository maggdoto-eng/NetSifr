import 'server-only';
import { prisma } from '@/lib/prisma';

export class DiscussionError extends Error {}

/** Only ACTIVE-enrolled participants may post/comment (completed = read-only). */
async function requireActiveEnrolment(userId: string, cohortId: string): Promise<string> {
  const enrolment = await prisma.enrolment.findUnique({
    where: { userId_cohortId: { userId, cohortId } },
    select: { status: true, organizationId: true },
  });
  if (!enrolment || enrolment.status !== 'ACTIVE') {
    throw new DiscussionError('Only active participants of this cohort can post.');
  }
  return enrolment.organizationId;
}

export async function createPost(input: {
  userId: string;
  cohortId: string;
  body: string;
}): Promise<{ id: string }> {
  const organizationId = await requireActiveEnrolment(input.userId, input.cohortId);
  const body = input.body.trim();
  if (!body) throw new DiscussionError('Write something first.');
  if (body.length > 4000) throw new DiscussionError('That’s too long — keep it under 4000 characters.');

  const post = await prisma.post.create({
    data: {
      cohortId: input.cohortId,
      organizationId,
      authorUserId: input.userId,
      audience: 'COHORT',
      body,
    },
    select: { id: true },
  });
  return post;
}

export async function addComment(input: {
  userId: string;
  postId: string;
  body: string;
}): Promise<void> {
  const post = await prisma.post.findUniqueOrThrow({
    where: { id: input.postId },
    select: { cohortId: true },
  });
  if (!post.cohortId) throw new DiscussionError('This post isn’t part of a cohort discussion.');
  await requireActiveEnrolment(input.userId, post.cohortId);
  const body = input.body.trim();
  if (!body) throw new DiscussionError('Write a reply first.');
  if (body.length > 4000) throw new DiscussionError('That’s too long — keep it under 4000 characters.');

  await prisma.comment.create({
    data: { postId: input.postId, authorUserId: input.userId, body },
  });
}

/** Posts for a cohort, newest first, with author + reply/like counts + my like. */
export async function getPostsForCohort(cohortId: string, userId: string, limit = 50) {
  return prisma.post.findMany({
    where: { cohortId, audience: 'COHORT', hiddenAt: null },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      author: { select: { id: true, name: true, avatarKey: true } },
      reactions: { where: { userId }, select: { id: true } },
      _count: { select: { comments: true, reactions: true } },
    },
  });
}

/** One post with its comments — scoped to the cohort to prevent cross-cohort reads. */
export async function getPostWithComments(postId: string, cohortId: string, userId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, cohortId, hiddenAt: null },
    include: {
      author: { select: { id: true, name: true, avatarKey: true } },
      reactions: { where: { userId }, select: { id: true } },
      _count: { select: { reactions: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true, avatarKey: true } } },
      },
    },
  });
  return post;
}
