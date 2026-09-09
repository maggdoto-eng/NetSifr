import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertInOrg } from '@/modules/organizations';

/**
 * Mark every ACTIVE enrolment in a cohort COMPLETED (the admin "finish this
 * cohort" action) — sets completedAt, unlocking each learner's certificate,
 * and notifies them. Org-scoped. Returns how many were completed.
 */
export async function markCohortEnrolmentsComplete(input: {
  cohortId: string;
  organizationId: string;
  actingUserId: string;
}): Promise<number> {
  const cohort = await prisma.cohort.findUniqueOrThrow({
    where: { id: input.cohortId },
    select: { organizationId: true },
  });
  assertInOrg(cohort.organizationId, input.organizationId);

  const active = await prisma.enrolment.findMany({
    where: { cohortId: input.cohortId, status: 'ACTIVE' },
    select: { userId: true },
  });
  if (active.length === 0) return 0;

  await prisma.$transaction([
    prisma.enrolment.updateMany({
      where: { cohortId: input.cohortId, status: 'ACTIVE' },
      data: { status: 'COMPLETED', completedAt: new Date() },
    }),
    prisma.notification.createMany({
      data: active.map((e) => ({
        userId: e.userId,
        type: 'GENERIC' as const,
        title: 'Course complete 🎉',
        body: 'You finished the program — your certificate is ready.',
        linkUrl: `/programs/${input.cohortId}/certificate`,
      })),
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: cohort.organizationId,
        actorUserId: input.actingUserId,
        action: 'cohort.completed',
        targetType: 'Cohort',
        targetId: input.cohortId,
        metadata: { completedCount: active.length },
      },
    }),
  ]);
  return active.length;
}

export async function getEnrolmentsForUser(userId: string) {
  return prisma.enrolment.findMany({
    where: { userId },
    include: {
      cohort: {
        include: {
          opportunity: true,
          courseVersion: { include: { course: true, weeks: { select: { id: true } } } },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  });
}

export async function getEnrolment(userId: string, cohortId: string) {
  return prisma.enrolment.findUnique({ where: { userId_cohortId: { userId, cohortId } } });
}

export async function getActiveEnrolment(userId: string, cohortId: string) {
  const enrolment = await getEnrolment(userId, cohortId);
  return enrolment && enrolment.status === 'ACTIVE' ? enrolment : null;
}

export async function withdrawEnrolment(enrolmentId: string): Promise<void> {
  await prisma.enrolment.update({
    where: { id: enrolmentId },
    data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
  });
}

export async function reinstateEnrolment(enrolmentId: string): Promise<void> {
  await prisma.enrolment.update({
    where: { id: enrolmentId },
    data: { status: 'ACTIVE', withdrawnAt: null },
  });
}
