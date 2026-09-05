import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { assertOrgAdmin, ForbiddenError } from '@/modules/organizations';
import { createTestOrg, createTestAdmin, createTestUser, cleanupOrg } from '../support/fixtures';

/**
 * Per docs/plan.md's testing matrix: a different-org member, a Suspended
 * member, and a plain (non-admin) member must all be denied admin actions —
 * not just "not tested". assertOrgAdmin is the actual gate every admin
 * Server Action calls, so it's exercised directly here.
 */
describe('assertOrgAdmin (tenant isolation)', () => {
  let orgAId: string;
  let orgBId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const orgA = await createTestOrg();
    const orgB = await createTestOrg();
    orgAId = orgA.id;
    orgBId = orgB.id;
  });

  afterAll(async () => {
    await cleanupOrg(orgAId, []);
    await cleanupOrg(orgBId, userIds);
  });

  it('allows an OWNER of the organization', async () => {
    const admin = await createTestAdmin(orgAId);
    userIds.push(admin.userId);
    await expect(assertOrgAdmin(admin.userId, orgAId)).resolves.toBeDefined();
  });

  it('denies a plain MEMBER of the same organization', async () => {
    const { userId } = await createTestUser('Plain Member');
    userIds.push(userId);
    await prisma.organizationMembership.create({
      data: { userId, organizationId: orgAId, role: 'MEMBER' },
    });
    await expect(assertOrgAdmin(userId, orgAId)).rejects.toThrow(ForbiddenError);
  });

  it('denies a SUSPENDED admin', async () => {
    const { userId } = await createTestUser('Suspended Admin');
    userIds.push(userId);
    await prisma.organizationMembership.create({
      data: { userId, organizationId: orgAId, role: 'ADMIN', status: 'SUSPENDED' },
    });
    await expect(assertOrgAdmin(userId, orgAId)).rejects.toThrow(ForbiddenError);
  });

  it('denies an admin of a DIFFERENT organization', async () => {
    const admin = await createTestAdmin(orgBId);
    userIds.push(admin.userId);
    await expect(assertOrgAdmin(admin.userId, orgAId)).rejects.toThrow(ForbiddenError);
  });

  it('denies a user with no membership at all', async () => {
    const { userId } = await createTestUser('No Membership');
    userIds.push(userId);
    await expect(assertOrgAdmin(userId, orgAId)).rejects.toThrow(ForbiddenError);
  });
});
