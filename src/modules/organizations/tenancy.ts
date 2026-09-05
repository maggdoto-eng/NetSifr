import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertInOrg } from './authorization';

/**
 * Resource-ownership assertions used by admin mutations/reads that receive a
 * bare resource id from the client. Each resolves the resource's owning
 * organization (walking the parent chain where a row has no direct
 * organizationId) and defers to assertInOrg — which throws ForbiddenError on
 * a mismatch OR a missing row. These live in the module layer, not the
 * Server Action, so the check is the same whether the caller is a web Server
 * Action or a future /api/v1 handler. The lookups are single indexed reads.
 */

export async function assertCohortInOrg(cohortId: string, organizationId: string): Promise<void> {
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: { organizationId: true },
  });
  assertInOrg(cohort?.organizationId, organizationId);
}

export async function assertCourseVersionInOrg(
  courseVersionId: string,
  organizationId: string,
): Promise<void> {
  const version = await prisma.courseVersion.findUnique({
    where: { id: courseVersionId },
    select: { course: { select: { organizationId: true } } },
  });
  assertInOrg(version?.course.organizationId, organizationId);
}

export async function assertWeekInOrg(weekId: string, organizationId: string): Promise<void> {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    select: { courseVersion: { select: { course: { select: { organizationId: true } } } } },
  });
  assertInOrg(week?.courseVersion.course.organizationId, organizationId);
}

export async function assertModuleInOrg(moduleId: string, organizationId: string): Promise<void> {
  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    select: {
      week: {
        select: { courseVersion: { select: { course: { select: { organizationId: true } } } } },
      },
    },
  });
  assertInOrg(mod?.week.courseVersion.course.organizationId, organizationId);
}

export async function assertRecordingModuleInOrg(
  recordingModuleId: string,
  organizationId: string,
): Promise<void> {
  const recording = await prisma.recordingModule.findUnique({
    where: { moduleId: recordingModuleId },
    select: {
      module: {
        select: {
          week: {
            select: { courseVersion: { select: { course: { select: { organizationId: true } } } } },
          },
        },
      },
    },
  });
  assertInOrg(recording?.module.week.courseVersion.course.organizationId, organizationId);
}

export async function assertSubmissionInOrg(
  submissionId: string,
  organizationId: string,
): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      assignmentModule: {
        select: {
          module: {
            select: {
              week: {
                select: {
                  courseVersion: { select: { course: { select: { organizationId: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });
  assertInOrg(
    submission?.assignmentModule.module.week.courseVersion.course.organizationId,
    organizationId,
  );
}

export async function assertEventInOrg(eventId: string, organizationId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizationId: true },
  });
  assertInOrg(event?.organizationId, organizationId);
}

export async function assertOccurrenceInOrg(
  occurrenceId: string,
  organizationId: string,
): Promise<void> {
  const occurrence = await prisma.eventOccurrence.findUnique({
    where: { id: occurrenceId },
    select: { organizationId: true },
  });
  assertInOrg(occurrence?.organizationId, organizationId);
}

export async function assertVolunteerOpportunityInOrg(
  volunteerOpportunityId: string,
  organizationId: string,
): Promise<void> {
  const opp = await prisma.volunteerOpportunity.findUnique({
    where: { id: volunteerOpportunityId },
    select: { organizationId: true },
  });
  assertInOrg(opp?.organizationId, organizationId);
}

export async function assertVolunteerApplicationInOrg(
  applicationId: string,
  organizationId: string,
): Promise<void> {
  const application = await prisma.volunteerApplication.findUnique({
    where: { id: applicationId },
    select: { organizationId: true },
  });
  assertInOrg(application?.organizationId, organizationId);
}

export async function assertShiftInOrg(shiftId: string, organizationId: string): Promise<void> {
  const shift = await prisma.volunteerShift.findUnique({
    where: { id: shiftId },
    select: { organizationId: true },
  });
  assertInOrg(shift?.organizationId, organizationId);
}

export async function assertServiceLogInOrg(
  serviceLogId: string,
  organizationId: string,
): Promise<void> {
  const log = await prisma.serviceLog.findUnique({
    where: { id: serviceLogId },
    select: { organizationId: true },
  });
  assertInOrg(log?.organizationId, organizationId);
}
