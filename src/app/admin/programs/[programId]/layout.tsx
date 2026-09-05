import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getDefaultOrganization } from '@/lib/org';

const TABS = [
  { segment: 'builder', label: 'Builder' },
  { segment: 'invites', label: 'Invites' },
  { segment: 'attendance', label: 'Attendance' },
  { segment: 'submissions', label: 'Submissions' },
];

export default async function ProgramLayout({
  children,
  params,
}: LayoutProps<'/admin/programs/[programId]'>) {
  const { programId } = await params;
  const org = await getDefaultOrganization();

  const cohort = await prisma.cohort.findFirst({
    where: { id: programId, organizationId: org.id },
    include: { opportunity: true },
  });
  if (!cohort) notFound();

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex h-14 flex-none items-center gap-4 border-b border-zinc-200 px-6">
        <Link href="/admin/programs" className="text-sm text-zinc-500 underline">
          ← Programs
        </Link>
        <div className="min-w-0 truncate text-sm font-semibold">{cohort.opportunity.title}</div>
        <nav className="ml-2 flex gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.segment}
              href={`/admin/programs/${programId}/${tab.segment}`}
              className="rounded px-3 py-1.5 text-sm hover:bg-zinc-100"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
