import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertCohortInOrg } from '@/modules/organizations';
import { computeUserAttendancePercent } from './attendance-summary';
import type { EnrolmentStatus, AttendanceConfirmationMethod } from '@/generated/prisma/client';

export type RosterRecordingColumn = { moduleId: string; title: string };

export type RosterRow = {
  enrolmentId: string;
  userId: string;
  name: string;
  email: string;
  status: EnrolmentStatus;
  attendancePercent: number;
  recordings: Array<{
    moduleId: string;
    confirmedAt: Date | null;
    method: AttendanceConfirmationMethod | null;
    engagedSeconds: number;
  }>;
};

/** Admin-facing roster — includes email (unlike the participant-facing cohort roster, which never shows it, see docs/plan.md). */
export async function getCohortRoster(
  cohortId: string,
  organizationId: string,
): Promise<{ recordings: RosterRecordingColumn[]; rows: RosterRow[] }> {
  await assertCohortInOrg(cohortId, organizationId);
  const cohort = await prisma.cohort.findUniqueOrThrow({
    where: { id: cohortId },
    select: { courseVersionId: true },
  });

  const [enrolments, recordingModules] = await Promise.all([
    prisma.enrolment.findMany({
      where: { cohortId },
      include: {
        user: { include: { credentials: { where: { type: 'EMAIL_PASSWORD' }, take: 1 } } },
      },
      orderBy: { enrolledAt: 'asc' },
    }),
    prisma.recordingModule.findMany({
      where: { module: { week: { courseVersionId: cohort.courseVersionId } } },
      include: { module: { include: { week: true } } },
    }),
  ]);

  const sortedRecordings = recordingModules
    .slice()
    .sort(
      (a, b) =>
        a.module.week.orderIndex - b.module.week.orderIndex ||
        a.module.orderIndex - b.module.orderIndex,
    );
  const recordingModuleIds = sortedRecordings.map((r) => r.moduleId);
  const userIds = enrolments.map((e) => e.userId);

  const attendanceRecords =
    recordingModuleIds.length === 0
      ? []
      : await prisma.attendanceRecord.findMany({
          where: { recordingModuleId: { in: recordingModuleIds }, userId: { in: userIds } },
        });
  const byUserAndModule = new Map(
    attendanceRecords.map((r) => [`${r.userId}:${r.recordingModuleId}`, r]),
  );

  const rows: RosterRow[] = await Promise.all(
    enrolments.map(async (enrolment) => ({
      enrolmentId: enrolment.id,
      userId: enrolment.userId,
      name: enrolment.user.name,
      email: enrolment.user.credentials[0]?.identifier ?? '—',
      status: enrolment.status,
      attendancePercent: await computeUserAttendancePercent(enrolment.userId, cohortId),
      recordings: sortedRecordings.map((r) => {
        const record = byUserAndModule.get(`${enrolment.userId}:${r.moduleId}`);
        return {
          moduleId: r.moduleId,
          confirmedAt: record?.attendanceConfirmedAt ?? null,
          method: record?.attendanceConfirmationMethod ?? null,
          engagedSeconds: record?.engagedSeconds ?? 0,
        };
      }),
    })),
  );

  return {
    recordings: sortedRecordings.map((r) => ({ moduleId: r.moduleId, title: r.module.title })),
    rows,
  };
}

export type CohortSubmission = Awaited<ReturnType<typeof getSubmissionsForCohort>>[number];

export async function getSubmissionsForCohort(cohortId: string, organizationId: string) {
  await assertCohortInOrg(cohortId, organizationId);
  const cohort = await prisma.cohort.findUniqueOrThrow({
    where: { id: cohortId },
    select: { courseVersionId: true },
  });

  const assignmentModuleIds = await prisma.assignmentModule
    .findMany({
      where: { module: { week: { courseVersionId: cohort.courseVersionId } } },
      select: { moduleId: true },
    })
    .then((rows) => rows.map((r) => r.moduleId));

  const enrolledUserIds = await prisma.enrolment
    .findMany({ where: { cohortId }, select: { userId: true } })
    .then((rows) => rows.map((r) => r.userId));

  if (assignmentModuleIds.length === 0 || enrolledUserIds.length === 0) return [];

  return prisma.submission.findMany({
    where: { assignmentModuleId: { in: assignmentModuleIds }, userId: { in: enrolledUserIds } },
    include: {
      user: { include: { credentials: { where: { type: 'EMAIL_PASSWORD' }, take: 1 } } },
      grade: true,
      assignmentModule: { include: { module: true } },
    },
    orderBy: { submittedAt: 'desc' },
  });
}
