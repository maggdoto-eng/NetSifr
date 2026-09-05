import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertInOrg } from '@/modules/organizations';
import type { VolunteerApplicationStatus } from '@/generated/prisma/client';

export class ApplicationError extends Error {}

/**
 * Self-service apply — the opportunity must be OPEN. A previously WITHDRAWN
 * or REJECTED application can be re-submitted (returns to APPLIED); an active
 * one (APPLIED/SHORTLISTED/ACCEPTED) blocks a duplicate.
 */
export async function applyToOpportunity(input: {
  userId: string;
  volunteerOpportunityId: string;
  message?: string;
}): Promise<{ status: VolunteerApplicationStatus }> {
  const opportunity = await prisma.volunteerOpportunity.findUniqueOrThrow({
    where: { id: input.volunteerOpportunityId },
  });
  if (opportunity.status !== 'OPEN') {
    throw new ApplicationError('This opportunity is not open for applications.');
  }
  if (opportunity.applyByDate && opportunity.applyByDate < new Date()) {
    throw new ApplicationError('The application deadline for this opportunity has passed.');
  }

  const existing = await prisma.volunteerApplication.findUnique({
    where: {
      userId_volunteerOpportunityId: {
        userId: input.userId,
        volunteerOpportunityId: input.volunteerOpportunityId,
      },
    },
  });
  if (existing && !['WITHDRAWN', 'REJECTED'].includes(existing.status)) {
    throw new ApplicationError("You've already applied to this opportunity.");
  }

  if (existing) {
    await prisma.volunteerApplication.update({
      where: { id: existing.id },
      data: {
        status: 'APPLIED',
        message: input.message,
        appliedAt: new Date(),
        decidedAt: null,
        decidedByUserId: null,
      },
    });
  } else {
    await prisma.volunteerApplication.create({
      data: {
        userId: input.userId,
        volunteerOpportunityId: input.volunteerOpportunityId,
        organizationId: opportunity.organizationId,
        message: input.message,
        status: 'APPLIED',
      },
    });
  }

  return { status: 'APPLIED' };
}

/** Participant withdraws their own application. */
export async function withdrawApplication(input: {
  userId: string;
  applicationId: string;
}): Promise<void> {
  const application = await prisma.volunteerApplication.findUniqueOrThrow({
    where: { id: input.applicationId },
  });
  if (application.userId !== input.userId) {
    throw new ApplicationError('This application is not yours to withdraw.');
  }
  await prisma.volunteerApplication.update({
    where: { id: application.id },
    data: { status: 'WITHDRAWN', decidedAt: new Date() },
  });
}

/** Admin decision: SHORTLISTED / ACCEPTED / REJECTED (WITHDRAWN is participant-only). */
export async function updateApplicationStatus(input: {
  applicationId: string;
  organizationId: string;
  actingUserId: string;
  status: 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED';
}): Promise<void> {
  const application = await prisma.volunteerApplication.findUniqueOrThrow({
    where: { id: input.applicationId },
  });
  assertInOrg(application.organizationId, input.organizationId);

  await prisma.$transaction([
    prisma.volunteerApplication.update({
      where: { id: application.id },
      data: {
        status: input.status,
        decidedAt: new Date(),
        decidedByUserId: input.actingUserId,
      },
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: application.organizationId,
        actorUserId: input.actingUserId,
        action: 'volunteer_application.status_changed',
        targetType: 'VolunteerApplication',
        targetId: application.id,
        metadata: { from: application.status, to: input.status },
      },
    }),
  ]);
}

export async function getUserApplication(userId: string, volunteerOpportunityId: string) {
  return prisma.volunteerApplication.findUnique({
    where: { userId_volunteerOpportunityId: { userId, volunteerOpportunityId } },
  });
}

/** True once a user's application to this opportunity is ACCEPTED — the gate for shift signup and service logging. */
export async function isAcceptedApplicant(
  userId: string,
  volunteerOpportunityId: string,
): Promise<boolean> {
  const application = await prisma.volunteerApplication.findUnique({
    where: { userId_volunteerOpportunityId: { userId, volunteerOpportunityId } },
    select: { status: true },
  });
  return application?.status === 'ACCEPTED';
}

/** Admin roster — includes email, org-scoped. */
export async function getApplicationsForOpportunity(
  volunteerOpportunityId: string,
  organizationId: string,
) {
  const opportunity = await prisma.volunteerOpportunity.findUnique({
    where: { id: volunteerOpportunityId },
    select: { organizationId: true },
  });
  assertInOrg(opportunity?.organizationId, organizationId);

  return prisma.volunteerApplication.findMany({
    where: { volunteerOpportunityId },
    include: {
      user: { include: { credentials: { where: { type: 'EMAIL_PASSWORD' }, take: 1 } } },
    },
    orderBy: { appliedAt: 'asc' },
  });
}
