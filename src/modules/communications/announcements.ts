import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertInOrg } from '@/modules/organizations';

/**
 * Post an announcement to a cohort and fan out a Notification to every ACTIVE
 * enrolled participant, in one transaction. Org-scoped in the module layer.
 */
export async function postAnnouncement(input: {
  cohortId: string;
  organizationId: string;
  authorUserId: string;
  title: string;
  body: string;
}) {
  const cohort = await prisma.cohort.findUniqueOrThrow({
    where: { id: input.cohortId },
    select: { organizationId: true },
  });
  assertInOrg(cohort.organizationId, input.organizationId);

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) throw new Error('A title and a message are both required.');

  return prisma.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: {
        cohortId: input.cohortId,
        organizationId: cohort.organizationId,
        authorUserId: input.authorUserId,
        title,
        body,
      },
    });
    const enrolments = await tx.enrolment.findMany({
      where: { cohortId: input.cohortId, status: 'ACTIVE' },
      select: { userId: true },
    });
    if (enrolments.length > 0) {
      await tx.notification.createMany({
        data: enrolments.map((e) => ({
          userId: e.userId,
          type: 'ANNOUNCEMENT' as const,
          title: `Announcement: ${title}`,
          body,
          linkUrl: `/programs/${input.cohortId}`,
        })),
      });
    }
    return announcement;
  });
}

export async function getAnnouncementsForCohort(cohortId: string, limit = 20) {
  return prisma.announcement.findMany({
    where: { cohortId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { author: { select: { name: true } } },
  });
}
