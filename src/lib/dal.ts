import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { OrgRole, OrganizationMembership } from '@/generated/prisma/client';

/**
 * Centralizes auth/authorization checks (see Next.js's Data Access Layer
 * guidance). The JWT session only ever identifies *who* the user is —
 * role/status/membership are re-fetched from the database on every call
 * here, never trusted from the token, so a revoked admin or suspended
 * member is cut off immediately rather than "whenever their token expires"
 * (see docs/plan.md, Identity & tenancy).
 */
export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return { userId: session.user.id };
});

export const getCurrentUser = cache(async () => {
  const { userId } = await verifySession();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  // An orphaned/suspended session (valid JWT, but the user no longer exists or
  // is inactive — e.g. after a DB re-seed or an account deletion) is sent to
  // /login with ?stale=1 so the proxy does NOT bounce it back to an app route
  // (which would loop). The stale cookie is replaced on the next sign-in.
  if (!user || user.status !== 'ACTIVE') redirect('/login?stale=1');
  return user;
});

export const getCurrentOrgMembership = cache(
  async (organizationId: string): Promise<OrganizationMembership | null> => {
    const user = await getCurrentUser();
    const membership = await prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId } },
    });
    if (!membership || membership.status !== 'ACTIVE') return null;
    return membership;
  },
);

const ADMIN_ROLES: OrgRole[] = ['OWNER', 'ADMIN'];

/** Redirects non-admins away — every /admin Server Action and layout uses this. */
export const requireOrgAdmin = cache(async (organizationId: string) => {
  const membership = await getCurrentOrgMembership(organizationId);
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    redirect('/programs');
  }
  return membership;
});
