import 'server-only';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { startOfDay, addDays } from '@/lib/dates';
import { uniqueSlug } from '@/lib/slug';
import { assertInOrg, assertCourseVersionInOrg } from '@/modules/organizations';
import { assertCourseVersionEditable } from './course-version';

/** Seeds N empty weeks, each pre-populated with a recording + reading slot, matching the prototype's "+ New Program" behavior. */
async function seedWeeksAndModules(
  tx: Prisma.TransactionClient,
  courseVersionId: string,
  weekCount: number,
) {
  const weeks = [];
  for (let i = 0; i < weekCount; i++) {
    const week = await tx.week.create({
      data: { courseVersionId, orderIndex: i, title: `Week ${i + 1}` },
    });
    await tx.module.create({
      data: {
        weekId: week.id,
        type: 'RECORDING',
        title: 'Recording',
        orderIndex: 0,
        recording: { create: { driveFileId: '' } },
      },
    });
    await tx.module.create({
      data: {
        weekId: week.id,
        type: 'READING',
        title: 'Reading',
        orderIndex: 1,
        reading: { create: { contentUrl: '' } },
      },
    });
    weeks.push(week);
  }
  return weeks;
}

async function seedSessionsForWeeks(
  tx: Prisma.TransactionClient,
  cohortId: string,
  cohortStartsAt: Date,
  weeks: Array<{ id: string; orderIndex: number }>,
) {
  for (const week of weeks) {
    const startsOn = addDays(cohortStartsAt, week.orderIndex * 7);
    const endsOn = addDays(startsOn, 6);
    await tx.cohortSession.create({
      data: { cohortId, weekId: week.id, startsOn, endsOn },
    });
  }
}

export async function createProgram(input: {
  organizationId: string;
  title: string;
  cohortLabel: string;
  weekCount: number;
  ownerUserId: string;
  startsAt?: Date;
}): Promise<{ cohortId: string }> {
  const startsAt = startOfDay(input.startsAt ?? new Date());

  return prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: { organizationId: input.organizationId, title: input.title },
    });
    const courseVersion = await tx.courseVersion.create({
      data: { courseId: course.id, versionNumber: 1 },
    });

    const weeks = await seedWeeksAndModules(tx, courseVersion.id, input.weekCount);

    const opportunity = await tx.opportunity.create({
      data: {
        organizationId: input.organizationId,
        type: 'COURSE',
        title: input.title,
        slug: uniqueSlug(input.title),
        visibility: 'INVITE_ONLY',
        status: 'DRAFT',
        startsAt,
        locationMode: 'ONLINE',
        ownerUserId: input.ownerUserId,
      },
    });
    await tx.opportunityOrganization.create({
      data: { opportunityId: opportunity.id, organizationId: input.organizationId, role: 'OWNER' },
    });

    const cohort = await tx.cohort.create({
      data: {
        courseVersionId: courseVersion.id,
        opportunityId: opportunity.id,
        organizationId: input.organizationId,
        cohortLabel: input.cohortLabel,
        startsAt,
        status: 'DRAFT',
      },
    });

    await seedSessionsForWeeks(tx, cohort.id, startsAt, weeks);

    return { cohortId: cohort.id };
  });
}

/**
 * Copies the week/schedule structure onto a NEW cohort referencing the SAME
 * CourseVersion (not a new Course/CourseVersion) — never copies roster,
 * enrolments, attendance, or submissions. See docs/plan.md's "Duplicate
 * cohort" default.
 */
export async function duplicateProgram(input: {
  cohortId: string;
  organizationId: string;
  actingUserId: string;
  newCohortLabel: string;
  startsAt?: Date;
}): Promise<{ cohortId: string }> {
  const source = await prisma.cohort.findUniqueOrThrow({
    where: { id: input.cohortId },
    include: { opportunity: true, courseVersion: { include: { weeks: true } } },
  });
  assertInOrg(source.organizationId, input.organizationId);

  const startsAt = startOfDay(input.startsAt ?? new Date());

  return prisma.$transaction(async (tx) => {
    const opportunity = await tx.opportunity.create({
      data: {
        organizationId: source.organizationId,
        type: 'COURSE',
        title: source.opportunity.title,
        slug: uniqueSlug(source.opportunity.title),
        visibility: 'INVITE_ONLY',
        status: 'DRAFT',
        startsAt,
        locationMode: 'ONLINE',
        ownerUserId: input.actingUserId,
      },
    });
    await tx.opportunityOrganization.create({
      data: { opportunityId: opportunity.id, organizationId: source.organizationId, role: 'OWNER' },
    });

    const cohort = await tx.cohort.create({
      data: {
        courseVersionId: source.courseVersionId,
        opportunityId: opportunity.id,
        organizationId: source.organizationId,
        cohortLabel: input.newCohortLabel,
        startsAt,
        attendanceUnlockMinutes: source.attendanceUnlockMinutes,
        status: 'DRAFT',
      },
    });

    await seedSessionsForWeeks(tx, cohort.id, startsAt, source.courseVersion.weeks);

    return { cohortId: cohort.id };
  });
}

export async function updateCohortStatus(input: {
  cohortId: string;
  organizationId: string;
  actingUserId: string;
  status: 'DRAFT' | 'LIVE' | 'ARCHIVED';
}): Promise<void> {
  const cohort = await prisma.cohort.findUniqueOrThrow({ where: { id: input.cohortId } });
  assertInOrg(cohort.organizationId, input.organizationId);

  await prisma.$transaction([
    prisma.cohort.update({ where: { id: cohort.id }, data: { status: input.status } }),
    prisma.opportunity.update({
      where: { id: cohort.opportunityId },
      data: { status: input.status },
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: cohort.organizationId,
        actorUserId: input.actingUserId,
        action: 'cohort.status_changed',
        targetType: 'Cohort',
        targetId: cohort.id,
        metadata: { from: cohort.status, to: input.status },
      },
    }),
  ]);
}

/**
 * Updates a cohort's editable identity/delivery settings — the program
 * Settings screen. Title/summary live on the shared Opportunity; the cohort
 * label and attendance-unlock minutes live on the Cohort. Curriculum content
 * is never touched here (that is CourseVersion-immutable). Org-scoped.
 */
export async function updateCohortSettings(input: {
  cohortId: string;
  organizationId: string;
  actingUserId: string;
  title: string;
  cohortLabel: string;
  summary: string;
  attendanceUnlockMinutes: number;
}): Promise<void> {
  const cohort = await prisma.cohort.findUniqueOrThrow({ where: { id: input.cohortId } });
  assertInOrg(cohort.organizationId, input.organizationId);

  const title = input.title.trim();
  const cohortLabel = input.cohortLabel.trim();
  if (!title) throw new Error('Title is required.');
  if (!cohortLabel) throw new Error('Cohort label is required.');
  const minutes = Math.min(240, Math.max(0, Math.round(input.attendanceUnlockMinutes)));

  await prisma.$transaction([
    prisma.opportunity.update({
      where: { id: cohort.opportunityId },
      data: { title, summary: input.summary.trim() || null },
    }),
    prisma.cohort.update({
      where: { id: cohort.id },
      data: { cohortLabel, attendanceUnlockMinutes: minutes },
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: cohort.organizationId,
        actorUserId: input.actingUserId,
        action: 'cohort.settings_updated',
        targetType: 'Cohort',
        targetId: cohort.id,
        metadata: { title, cohortLabel, attendanceUnlockMinutes: minutes },
      },
    }),
  ]);
}

/** Adds a week to the curriculum and a matching CohortSession to every cohort currently running this CourseVersion. */
export async function addWeek(input: {
  courseVersionId: string;
  organizationId: string;
}): Promise<{ weekId: string }> {
  await assertCourseVersionInOrg(input.courseVersionId, input.organizationId);
  await assertCourseVersionEditable(input.courseVersionId);

  return prisma.$transaction(async (tx) => {
    const lastWeek = await tx.week.findFirst({
      where: { courseVersionId: input.courseVersionId },
      orderBy: { orderIndex: 'desc' },
    });
    const orderIndex = lastWeek ? lastWeek.orderIndex + 1 : 0;

    const week = await tx.week.create({
      data: { courseVersionId: input.courseVersionId, orderIndex, title: `Week ${orderIndex + 1}` },
    });
    await tx.module.create({
      data: {
        weekId: week.id,
        type: 'RECORDING',
        title: 'Recording',
        orderIndex: 0,
        recording: { create: { driveFileId: '' } },
      },
    });
    await tx.module.create({
      data: {
        weekId: week.id,
        type: 'READING',
        title: 'Reading',
        orderIndex: 1,
        reading: { create: { contentUrl: '' } },
      },
    });

    const cohorts = await tx.cohort.findMany({ where: { courseVersionId: input.courseVersionId } });
    for (const cohort of cohorts) {
      const startsOn = addDays(cohort.startsAt, orderIndex * 7);
      const endsOn = addDays(startsOn, 6);
      await tx.cohortSession.create({
        data: { cohortId: cohort.id, weekId: week.id, startsOn, endsOn },
      });
    }

    return { weekId: week.id };
  });
}

/** Two-phase index shift avoids a transient unique-constraint collision when swapping/reordering. */
export async function reorderWeeks(input: {
  courseVersionId: string;
  organizationId: string;
  orderedWeekIds: string[];
}): Promise<void> {
  await assertCourseVersionInOrg(input.courseVersionId, input.organizationId);
  await assertCourseVersionEditable(input.courseVersionId);
  const OFFSET = 100_000;
  await prisma.$transaction([
    ...input.orderedWeekIds.map((weekId, index) =>
      prisma.week.update({ where: { id: weekId }, data: { orderIndex: OFFSET + index } }),
    ),
    ...input.orderedWeekIds.map((weekId, index) =>
      prisma.week.update({ where: { id: weekId }, data: { orderIndex: index } }),
    ),
  ]);
}
