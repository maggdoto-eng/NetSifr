import 'server-only';
import { prisma } from '@/lib/prisma';

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
