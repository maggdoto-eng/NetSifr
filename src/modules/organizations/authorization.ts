import 'server-only';
import { prisma } from '@/lib/prisma';
import type { OrgRole } from '@/generated/prisma/client';

/**
 * Throw-based authorization for use inside Server Actions/mutations, which
 * generally want to return a typed error to the caller rather than redirect
 * mid-mutation. src/lib/dal.ts holds the redirect-based equivalents for
 * page/layout guards. Both re-check the database on every call — the
 * session only ever identifies who the user is (see docs/plan.md).
 */
export class ForbiddenError extends Error {}

/**
 * Pure org-ownership comparator. `assertOrgAdmin` proves *who* may act; this
 * proves the *resource* they're acting on belongs to their org. Every admin
 * mutation/read that takes a resource id from the client must pass that
 * resource's organizationId through here — otherwise, once a second
 * Organization exists, an admin of org A could act on org B's data by id
 * (the whole point of keeping the check in the module layer, not just the
 * Server Action, is that a future /api/v1 caller is protected too). A
 * null/undefined resource org (row not found, or the row simply doesn't
 * belong) is treated the same as a mismatch — an admin must not be able to
 * distinguish "not yours" from "doesn't exist".
 */
export function assertInOrg(
  resourceOrganizationId: string | null | undefined,
  organizationId: string,
): void {
  if (resourceOrganizationId !== organizationId) {
    throw new ForbiddenError('This resource is not part of your organization.');
  }
}

const ADMIN_ROLES: OrgRole[] = ['OWNER', 'ADMIN'];

export async function assertOrgAdmin(userId: string, organizationId: string) {
  const membership = await prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!membership || membership.status !== 'ACTIVE' || !ADMIN_ROLES.includes(membership.role)) {
    throw new ForbiddenError('Not authorized as an organization admin.');
  }
  return membership;
}
