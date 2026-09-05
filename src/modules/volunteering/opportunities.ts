import 'server-only';
import { prisma } from '@/lib/prisma';
import { uniqueSlug } from '@/lib/slug';
import { assertInOrg, assertVolunteerOpportunityInOrg } from '@/modules/organizations';
import type {
  LocationMode,
  OpportunityStatus,
  VolunteerOpportunityStatus,
} from '@/generated/prisma/client';

/**
 * Maps the volunteering-specific status to the shared Opportunity envelope's
 * status: OPEN is what makes it discoverable/LIVE on /discover; DRAFT stays
 * DRAFT; CLOSED/ARCHIVED both fold to ARCHIVED (no longer discoverable).
 */
function toOpportunityStatus(status: VolunteerOpportunityStatus): OpportunityStatus {
  if (status === 'DRAFT') return 'DRAFT';
  if (status === 'OPEN') return 'LIVE';
  return 'ARCHIVED';
}

/**
 * Creates the reusable/joinable VolunteerOpportunity together with its 1:1
 * PUBLIC Opportunity envelope (self-service, like Events — opposite of a
 * Cohort's INVITE_ONLY) and the single OWNER OpportunityOrganization row.
 */
export async function createVolunteerOpportunity(input: {
  organizationId: string;
  ownerUserId: string;
  title: string;
  description?: string;
  locationMode?: LocationMode;
  applyByDate?: Date;
}): Promise<{ volunteerOpportunityId: string }> {
  const created = await prisma.$transaction(async (tx) => {
    const opportunity = await tx.opportunity.create({
      data: {
        organizationId: input.organizationId,
        type: 'VOLUNTEERING',
        title: input.title,
        slug: uniqueSlug(input.title),
        visibility: 'PUBLIC',
        status: 'DRAFT',
        locationMode: input.locationMode ?? 'ONLINE',
        ownerUserId: input.ownerUserId,
      },
    });
    await tx.opportunityOrganization.create({
      data: {
        opportunityId: opportunity.id,
        organizationId: input.organizationId,
        role: 'OWNER',
      },
    });
    return tx.volunteerOpportunity.create({
      data: {
        opportunityId: opportunity.id,
        organizationId: input.organizationId,
        title: input.title,
        description: input.description,
        locationMode: input.locationMode ?? 'ONLINE',
        applyByDate: input.applyByDate,
      },
    });
  });

  return { volunteerOpportunityId: created.id };
}

export async function updateVolunteerOpportunityStatus(input: {
  volunteerOpportunityId: string;
  organizationId: string;
  actingUserId: string;
  status: VolunteerOpportunityStatus;
}): Promise<void> {
  const opportunity = await prisma.volunteerOpportunity.findUniqueOrThrow({
    where: { id: input.volunteerOpportunityId },
  });
  assertInOrg(opportunity.organizationId, input.organizationId);

  await prisma.$transaction([
    prisma.volunteerOpportunity.update({
      where: { id: opportunity.id },
      data: { status: input.status },
    }),
    prisma.opportunity.update({
      where: { id: opportunity.opportunityId },
      data: { status: toOpportunityStatus(input.status) },
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: opportunity.organizationId,
        actorUserId: input.actingUserId,
        action: 'volunteer_opportunity.status_changed',
        targetType: 'VolunteerOpportunity',
        targetId: opportunity.id,
        metadata: { from: opportunity.status, to: input.status },
      },
    }),
  ]);
}

export async function addShift(input: {
  volunteerOpportunityId: string;
  organizationId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  capacity?: number;
}): Promise<{ shiftId: string }> {
  await assertVolunteerOpportunityInOrg(input.volunteerOpportunityId, input.organizationId);
  const shift = await prisma.volunteerShift.create({
    data: {
      volunteerOpportunityId: input.volunteerOpportunityId,
      organizationId: input.organizationId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      capacity: input.capacity,
    },
  });
  return { shiftId: shift.id };
}

export async function getVolunteerOpportunitiesForOrg(organizationId: string) {
  return prisma.volunteerOpportunity.findMany({
    where: { organizationId },
    include: {
      _count: { select: { applications: true, shifts: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Dual-use: admin pages pass organizationId to scope the lookup to their
 * org; the participant /discover detail page reads a PUBLIC opportunity with
 * no org context and omits it.
 */
export async function getVolunteerOpportunityDetail(
  volunteerOpportunityId: string,
  organizationId?: string,
) {
  const opportunity = await prisma.volunteerOpportunity.findUniqueOrThrow({
    where: { id: volunteerOpportunityId },
    include: {
      opportunity: true,
      location: true,
      shifts: { orderBy: { startsAt: 'asc' }, include: { _count: { select: { signups: true } } } },
      skillRequirements: { include: { skill: true } },
    },
  });
  if (organizationId !== undefined) assertInOrg(opportunity.organizationId, organizationId);
  return opportunity;
}

/** "My volunteering" — every opportunity the user has applied to, with the current application status. */
export async function getMyVolunteering(userId: string) {
  const applications = await prisma.volunteerApplication.findMany({
    where: { userId },
    include: { volunteerOpportunity: true },
    orderBy: { appliedAt: 'desc' },
  });
  return applications.map((a) => ({
    applicationId: a.id,
    status: a.status,
    volunteerOpportunityId: a.volunteerOpportunityId,
    title: a.volunteerOpportunity.title,
    appliedAt: a.appliedAt,
  }));
}
