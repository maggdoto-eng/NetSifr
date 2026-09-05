import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getActiveEnrolment, withdrawEnrolment } from '@/modules/learning';
import {
  createTestOrg,
  createTestAdmin,
  createTestUser,
  createLiveCohortWithModules,
  enrolUser,
  cleanupOrg,
} from '../support/fixtures';

/**
 * Per docs/plan.md's testing matrix: an unenrolled user must be denied
 * access to a cohort's content. getActiveEnrolment is what
 * app/(participant)/programs/[programId]/layout.tsx calls to decide
 * notFound() vs render — this exercises that gate directly.
 */
describe('cohort access (enrolment isolation)', () => {
  let orgId: string;
  let adminUserId: string;
  let cohortId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const org = await createTestOrg();
    orgId = org.id;
    const admin = await createTestAdmin(orgId);
    adminUserId = admin.userId;
    userIds.push(adminUserId);
    const cohort = await createLiveCohortWithModules({
      organizationId: orgId,
      ownerUserId: adminUserId,
    });
    cohortId = cohort.cohortId;
  });

  afterAll(async () => {
    await cleanupOrg(orgId, userIds);
  });

  it('grants access to an actively enrolled user', async () => {
    const { userId, email } = await createTestUser('Enrolled');
    userIds.push(userId);
    await enrolUser({ cohortId, userId, email, createdByUserId: adminUserId });

    const enrolment = await getActiveEnrolment(userId, cohortId);
    expect(enrolment).not.toBeNull();
    expect(enrolment?.status).toBe('ACTIVE');
  });

  it('denies a user who was never invited or enrolled', async () => {
    const { userId } = await createTestUser('Never Enrolled');
    userIds.push(userId);

    const enrolment = await getActiveEnrolment(userId, cohortId);
    expect(enrolment).toBeNull();
  });

  it('denies a user whose enrolment was withdrawn', async () => {
    const { userId, email } = await createTestUser('Withdrawn');
    userIds.push(userId);
    await enrolUser({ cohortId, userId, email, createdByUserId: adminUserId });

    const active = await getActiveEnrolment(userId, cohortId);
    await withdrawEnrolment(active!.id);

    const afterWithdrawal = await getActiveEnrolment(userId, cohortId);
    expect(afterWithdrawal).toBeNull();
  });
});
