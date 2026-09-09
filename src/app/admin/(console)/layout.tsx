import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDefaultOrganization } from '@/lib/org';
import { requireOrgAdmin, getCurrentUser } from '@/lib/dal';
import { AdminRail } from './admin-rail';

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Org owner',
  ADMIN: 'Org admin',
  COORDINATOR: 'Coordinator',
  MEMBER: 'Member',
};

export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  // Unauthenticated visitors to the admin console land on the *admin* login
  // (a separate door from the participant /login), not the participant one.
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');

  const org = await getDefaultOrganization();
  const [membership, user, cohorts] = await Promise.all([
    requireOrgAdmin(org.id),
    getCurrentUser(),
    prisma.cohort.findMany({
      where: { organizationId: org.id },
      select: { id: true, cohortLabel: true, opportunity: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const programs = cohorts.map((c, index) => ({
    id: c.id,
    title: c.opportunity.title,
    cohortLabel: c.cohortLabel,
    index,
  }));

  return (
    <div className="a-shell">
      <AdminRail
        programs={programs}
        signedIn={{ name: user.name, role: ROLE_LABEL[membership.role] ?? 'Staff' }}
      />
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}
