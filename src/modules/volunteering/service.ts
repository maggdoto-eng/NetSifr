import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertInOrg } from '@/modules/organizations';
import { awardVolunteerHoursVerified } from '@/modules/recognition';
import { isAcceptedApplicant } from './applications';

export class ServiceLogError extends Error {}

const MAX_HOURS_PER_LOG = 24;

/**
 * A volunteer files hours (mirrors Submission). Only an ACCEPTED applicant of
 * the opportunity may log against it; an optional shiftId ties the log to a
 * specific slot. Filed as PENDING until an admin verifies it.
 */
export async function logService(input: {
  userId: string;
  volunteerOpportunityId: string;
  shiftId?: string;
  hours: number;
  note?: string;
  occurredOn: Date;
}): Promise<{ serviceLogId: string }> {
  if (!Number.isFinite(input.hours) || input.hours <= 0 || input.hours > MAX_HOURS_PER_LOG) {
    throw new ServiceLogError(`Enter a number of hours between 0 and ${MAX_HOURS_PER_LOG}.`);
  }

  const opportunity = await prisma.volunteerOpportunity.findUniqueOrThrow({
    where: { id: input.volunteerOpportunityId },
    select: { organizationId: true },
  });
  if (!(await isAcceptedApplicant(input.userId, input.volunteerOpportunityId))) {
    throw new ServiceLogError('Only accepted volunteers can log hours for this opportunity.');
  }

  if (input.shiftId) {
    const shift = await prisma.volunteerShift.findUnique({
      where: { id: input.shiftId },
      select: { volunteerOpportunityId: true },
    });
    if (!shift || shift.volunteerOpportunityId !== input.volunteerOpportunityId) {
      throw new ServiceLogError('That shift does not belong to this opportunity.');
    }
  }

  const log = await prisma.serviceLog.create({
    data: {
      userId: input.userId,
      volunteerOpportunityId: input.volunteerOpportunityId,
      shiftId: input.shiftId,
      organizationId: opportunity.organizationId,
      hours: input.hours,
      note: input.note,
      occurredOn: input.occurredOn,
      status: 'PENDING',
    },
  });
  return { serviceLogId: log.id };
}

/**
 * Admin verification (mirrors grading). A VERIFIED verification flips the log
 * and writes the points award once (keyed by the log id); REJECTED records
 * the decision without points. Re-verifying is idempotent for points —
 * awardVolunteerHoursVerified upserts on the same key.
 */
export async function verifyService(input: {
  serviceLogId: string;
  organizationId: string;
  verifiedByUserId: string;
  status: 'VERIFIED' | 'REJECTED';
  note?: string;
}): Promise<void> {
  const log = await prisma.serviceLog.findUniqueOrThrow({ where: { id: input.serviceLogId } });
  assertInOrg(log.organizationId, input.organizationId);

  await prisma.$transaction([
    prisma.serviceVerification.upsert({
      where: { serviceLogId: log.id },
      create: {
        serviceLogId: log.id,
        status: input.status,
        note: input.note,
        verifiedByUserId: input.verifiedByUserId,
      },
      update: { status: input.status, note: input.note, verifiedByUserId: input.verifiedByUserId },
    }),
    prisma.serviceLog.update({
      where: { id: log.id },
      data: { status: input.status },
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: log.organizationId,
        actorUserId: input.verifiedByUserId,
        action: 'service_log.verified',
        targetType: 'ServiceLog',
        targetId: log.id,
        metadata: { status: input.status, hours: log.hours },
      },
    }),
  ]);

  if (input.status === 'VERIFIED') {
    await awardVolunteerHoursVerified({
      userId: log.userId,
      organizationId: log.organizationId,
      serviceLogId: log.id,
      hours: log.hours,
    });
  }
}

export async function getUserServiceLogs(userId: string, volunteerOpportunityId: string) {
  return prisma.serviceLog.findMany({
    where: { userId, volunteerOpportunityId },
    include: { verification: true },
    orderBy: { occurredOn: 'desc' },
  });
}

/** Admin queue of PENDING logs across the org, newest first — includes volunteer email + opportunity title. */
export async function getPendingServiceLogs(organizationId: string) {
  return prisma.serviceLog.findMany({
    where: { organizationId, status: 'PENDING' },
    include: {
      user: { include: { credentials: { where: { type: 'EMAIL_PASSWORD' }, take: 1 } } },
      volunteerOpportunity: { select: { id: true, title: true } },
    },
    orderBy: { loggedAt: 'asc' },
  });
}
