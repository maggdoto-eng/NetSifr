import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getDefaultOrganization } from '@/lib/org';

// The program workspace nav now lives in the admin rail (THIS PROGRAM group).
// This layout only guards that the cohort exists within the current org; each
// page renders its own `.a-topbar`.
export default async function ProgramLayout({
  children,
  params,
}: LayoutProps<'/admin/programs/[programId]'>) {
  const { programId } = await params;
  const org = await getDefaultOrganization();
  const cohort = await prisma.cohort.findFirst({
    where: { id: programId, organizationId: org.id },
    select: { id: true },
  });
  if (!cohort) notFound();
  return children;
}
