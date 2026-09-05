import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { ForbiddenError } from '@/modules/organizations';
import { getTotalPoints } from '@/modules/recognition';
import {
  createVolunteerOpportunity,
  updateVolunteerOpportunityStatus,
  addShift,
  applyToOpportunity,
  withdrawApplication,
  updateApplicationStatus,
  getUserApplication,
  isAcceptedApplicant,
  signUpForShift,
  updateSignupStatus,
  logService,
  verifyService,
  getUserServiceLogs,
  getPendingServiceLogs,
  ApplicationError,
  ShiftError,
  ServiceLogError,
} from '@/modules/volunteering';
import { createTestOrg, createTestAdmin, createTestUser, cleanupOrg } from '../support/fixtures';

async function openOpportunity(organizationId: string, ownerUserId: string) {
  const { volunteerOpportunityId } = await createVolunteerOpportunity({
    organizationId,
    ownerUserId,
    title: `Beach Cleanup ${Date.now()}-${Math.random()}`,
    description: 'Help clean the shoreline.',
  });
  await updateVolunteerOpportunityStatus({
    volunteerOpportunityId,
    organizationId,
    actingUserId: ownerUserId,
    status: 'OPEN',
  });
  return volunteerOpportunityId;
}

describe('volunteering: application lifecycle', () => {
  let orgId: string;
  let adminId: string;
  let oppId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const org = await createTestOrg();
    orgId = org.id;
    const admin = await createTestAdmin(orgId);
    adminId = admin.userId;
    userIds.push(adminId);
    oppId = await openOpportunity(orgId, adminId);
  });

  afterAll(async () => {
    await cleanupOrg(orgId, userIds);
  });

  it('refuses to apply to a DRAFT opportunity', async () => {
    const { volunteerOpportunityId } = await createVolunteerOpportunity({
      organizationId: orgId,
      ownerUserId: adminId,
      title: 'Draft opp',
    });
    const { userId } = await createTestUser('Early Applicant');
    userIds.push(userId);
    await expect(applyToOpportunity({ userId, volunteerOpportunityId })).rejects.toThrow(
      ApplicationError,
    );
  });

  it('accepts an application, blocks a duplicate, and allows re-apply after withdrawal', async () => {
    const { userId } = await createTestUser('Applicant');
    userIds.push(userId);

    const first = await applyToOpportunity({ userId, volunteerOpportunityId: oppId });
    expect(first.status).toBe('APPLIED');

    await expect(applyToOpportunity({ userId, volunteerOpportunityId: oppId })).rejects.toThrow(
      ApplicationError,
    );

    const application = await getUserApplication(userId, oppId);
    await withdrawApplication({ userId, applicationId: application!.id });
    expect((await getUserApplication(userId, oppId))!.status).toBe('WITHDRAWN');

    const reapplied = await applyToOpportunity({ userId, volunteerOpportunityId: oppId });
    expect(reapplied.status).toBe('APPLIED');
  });

  it('lets an admin shortlist then accept, flipping isAcceptedApplicant', async () => {
    const { userId } = await createTestUser('Accepted Volunteer');
    userIds.push(userId);
    await applyToOpportunity({ userId, volunteerOpportunityId: oppId });
    const application = await getUserApplication(userId, oppId);

    await updateApplicationStatus({
      applicationId: application!.id,
      organizationId: orgId,
      actingUserId: adminId,
      status: 'SHORTLISTED',
    });
    expect(await isAcceptedApplicant(userId, oppId)).toBe(false);

    await updateApplicationStatus({
      applicationId: application!.id,
      organizationId: orgId,
      actingUserId: adminId,
      status: 'ACCEPTED',
    });
    expect(await isAcceptedApplicant(userId, oppId)).toBe(true);
  });
});

describe('volunteering: shifts, service logging, points', () => {
  let orgId: string;
  let adminId: string;
  let oppId: string;
  let acceptedUserId: string;
  const userIds: string[] = [];

  async function acceptedVolunteer(name: string) {
    const { userId } = await createTestUser(name);
    userIds.push(userId);
    await applyToOpportunity({ userId, volunteerOpportunityId: oppId });
    const application = await getUserApplication(userId, oppId);
    await updateApplicationStatus({
      applicationId: application!.id,
      organizationId: orgId,
      actingUserId: adminId,
      status: 'ACCEPTED',
    });
    return userId;
  }

  beforeAll(async () => {
    const org = await createTestOrg();
    orgId = org.id;
    const admin = await createTestAdmin(orgId);
    adminId = admin.userId;
    userIds.push(adminId);
    oppId = await openOpportunity(orgId, adminId);
    acceptedUserId = await acceptedVolunteer('Primary Volunteer');
  });

  afterAll(async () => {
    await cleanupOrg(orgId, userIds);
  });

  it('refuses shift signup for a non-accepted user', async () => {
    const { userId } = await createTestUser('Just Applied');
    userIds.push(userId);
    await applyToOpportunity({ userId, volunteerOpportunityId: oppId });
    const { shiftId } = await addShift({
      volunteerOpportunityId: oppId,
      organizationId: orgId,
      title: 'Morning',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    });
    await expect(signUpForShift({ userId, shiftId })).rejects.toThrow(ShiftError);
  });

  it('refuses shift signup past capacity', async () => {
    const { shiftId } = await addShift({
      volunteerOpportunityId: oppId,
      organizationId: orgId,
      title: 'Tiny shift',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      capacity: 1,
    });
    await signUpForShift({ userId: acceptedUserId, shiftId });

    const second = await acceptedVolunteer('Second Volunteer');
    await expect(signUpForShift({ userId: second, shiftId })).rejects.toThrow(ShiftError);
  });

  it('refuses logging hours for a non-accepted user', async () => {
    const { userId } = await createTestUser('Not Accepted Logger');
    userIds.push(userId);
    await applyToOpportunity({ userId, volunteerOpportunityId: oppId });
    await expect(
      logService({
        userId,
        volunteerOpportunityId: oppId,
        hours: 2,
        occurredOn: new Date(),
      }),
    ).rejects.toThrow(ServiceLogError);
  });

  it('rejects non-positive or oversized hours', async () => {
    await expect(
      logService({
        userId: acceptedUserId,
        volunteerOpportunityId: oppId,
        hours: 0,
        occurredOn: new Date(),
      }),
    ).rejects.toThrow(ServiceLogError);
    await expect(
      logService({
        userId: acceptedUserId,
        volunteerOpportunityId: oppId,
        hours: 99,
        occurredOn: new Date(),
      }),
    ).rejects.toThrow(ServiceLogError);
  });

  it('awards 20 points per verified hour exactly once, and none for a rejected log', async () => {
    const before = await getTotalPoints(acceptedUserId);

    const { serviceLogId } = await logService({
      userId: acceptedUserId,
      volunteerOpportunityId: oppId,
      hours: 3,
      note: 'Cleaned the north beach.',
      occurredOn: new Date(),
    });
    await verifyService({
      serviceLogId,
      organizationId: orgId,
      verifiedByUserId: adminId,
      status: 'VERIFIED',
    });
    // Re-verify (idempotent for points).
    await verifyService({
      serviceLogId,
      organizationId: orgId,
      verifiedByUserId: adminId,
      status: 'VERIFIED',
    });
    expect(await getTotalPoints(acceptedUserId)).toBe(before + 60);

    const logs = await getUserServiceLogs(acceptedUserId, oppId);
    expect(logs.find((l) => l.id === serviceLogId)?.status).toBe('VERIFIED');

    // A rejected log awards nothing.
    const rejectedUser = await acceptedVolunteer('Rejected Logger');
    const rejectedBefore = await getTotalPoints(rejectedUser);
    const { serviceLogId: rejectedLogId } = await logService({
      userId: rejectedUser,
      volunteerOpportunityId: oppId,
      hours: 5,
      occurredOn: new Date(),
    });
    await verifyService({
      serviceLogId: rejectedLogId,
      organizationId: orgId,
      verifiedByUserId: adminId,
      status: 'REJECTED',
    });
    expect(await getTotalPoints(rejectedUser)).toBe(rejectedBefore);
  });

  it('surfaces pending logs to the admin queue and clears them once decided', async () => {
    const pending = await getPendingServiceLogs(orgId);
    const before = pending.length;
    const { serviceLogId } = await logService({
      userId: acceptedUserId,
      volunteerOpportunityId: oppId,
      hours: 1,
      occurredOn: new Date(),
    });
    expect((await getPendingServiceLogs(orgId)).length).toBe(before + 1);
    await verifyService({
      serviceLogId,
      organizationId: orgId,
      verifiedByUserId: adminId,
      status: 'VERIFIED',
    });
    expect((await getPendingServiceLogs(orgId)).length).toBe(before);
  });
});

describe('volunteering: tenant isolation', () => {
  let orgAId: string;
  let orgBId: string;
  let adminAId: string;
  let adminBId: string;
  let oppId: string;
  let applicationId: string;
  let shiftSignupId: string;
  let serviceLogId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const orgA = await createTestOrg();
    const orgB = await createTestOrg();
    orgAId = orgA.id;
    orgBId = orgB.id;
    adminAId = (await createTestAdmin(orgAId)).userId;
    adminBId = (await createTestAdmin(orgBId)).userId;
    userIds.push(adminAId, adminBId);

    oppId = await openOpportunity(orgAId, adminAId);
    const volunteer = await createTestUser('Org A Volunteer');
    userIds.push(volunteer.userId);
    await applyToOpportunity({ userId: volunteer.userId, volunteerOpportunityId: oppId });
    applicationId = (await getUserApplication(volunteer.userId, oppId))!.id;
    await updateApplicationStatus({
      applicationId,
      organizationId: orgAId,
      actingUserId: adminAId,
      status: 'ACCEPTED',
    });
    const { shiftId } = await addShift({
      volunteerOpportunityId: oppId,
      organizationId: orgAId,
      title: 'Shift',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    });
    await signUpForShift({ userId: volunteer.userId, shiftId });
    shiftSignupId = (await prisma.shiftSignup.findFirstOrThrow({ where: { shiftId } })).id;
    const log = await logService({
      userId: volunteer.userId,
      volunteerOpportunityId: oppId,
      hours: 2,
      occurredOn: new Date(),
    });
    serviceLogId = log.serviceLogId;
  });

  afterAll(async () => {
    await cleanupOrg(orgAId, []);
    await cleanupOrg(orgBId, userIds);
  });

  it('denies org B every admin action against org A resources', async () => {
    await expect(
      updateVolunteerOpportunityStatus({
        volunteerOpportunityId: oppId,
        organizationId: orgBId,
        actingUserId: adminBId,
        status: 'CLOSED',
      }),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      addShift({
        volunteerOpportunityId: oppId,
        organizationId: orgBId,
        title: 'Injected',
        startsAt: new Date(),
        endsAt: new Date(),
      }),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      updateApplicationStatus({
        applicationId,
        organizationId: orgBId,
        actingUserId: adminBId,
        status: 'REJECTED',
      }),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      updateSignupStatus({
        signupId: shiftSignupId,
        organizationId: orgBId,
        actingUserId: adminBId,
        status: 'NO_SHOW',
      }),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      verifyService({
        serviceLogId,
        organizationId: orgBId,
        verifiedByUserId: adminBId,
        status: 'VERIFIED',
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
