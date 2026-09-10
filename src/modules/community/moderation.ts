import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertInOrg } from '@/modules/organizations';

export async function reportPost(input: {
  reporterUserId: string;
  postId: string;
  reason: string;
}): Promise<void> {
  const post = await prisma.post.findUniqueOrThrow({
    where: { id: input.postId },
    select: { organizationId: true },
  });
  await prisma.report.create({
    data: {
      postId: input.postId,
      organizationId: post.organizationId,
      reporterUserId: input.reporterUserId,
      reason: input.reason.trim().slice(0, 500) || 'No reason given',
    },
  });
}

export async function getOpenReports(organizationId: string) {
  return prisma.report.findMany({
    where: { organizationId, status: 'OPEN' },
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { name: true } },
      post: {
        select: {
          id: true,
          body: true,
          hiddenAt: true,
          author: { select: { name: true } },
          cohort: { select: { cohortLabel: true, opportunity: { select: { title: true } } } },
        },
      },
    },
  });
}

/** Hide a post and mark all its reports actioned. Org-scoped. */
export async function hidePostFromReport(input: {
  reportId: string;
  organizationId: string;
}): Promise<void> {
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: input.reportId },
    select: { organizationId: true, postId: true },
  });
  assertInOrg(report.organizationId, input.organizationId);
  await prisma.$transaction([
    prisma.post.update({ where: { id: report.postId }, data: { hiddenAt: new Date() } }),
    prisma.report.updateMany({ where: { postId: report.postId }, data: { status: 'ACTIONED' } }),
  ]);
}

export async function dismissReport(input: { reportId: string; organizationId: string }): Promise<void> {
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: input.reportId },
    select: { organizationId: true },
  });
  assertInOrg(report.organizationId, input.organizationId);
  await prisma.report.update({ where: { id: input.reportId }, data: { status: 'DISMISSED' } });
}
