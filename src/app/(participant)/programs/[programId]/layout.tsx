import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { getActiveEnrolment } from '@/modules/learning';

const NAV_ITEMS = [
  { href: '', label: 'Home' },
  { href: '/weeks', label: 'Weeks' },
  { href: '/cohort', label: 'Cohort' },
];

export default async function ProgramLayout({
  children,
  params,
}: LayoutProps<'/programs/[programId]'>) {
  const { programId } = await params;
  const { userId } = await verifySession();

  const enrolment = await getActiveEnrolment(userId, programId);
  if (!enrolment) notFound();

  const cohort = await prisma.cohort.findUnique({
    where: { id: programId },
    include: { opportunity: true },
  });
  if (!cohort) notFound();

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      <nav className="flex h-16 flex-none items-center justify-around border-t border-zinc-200 bg-white">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={`/programs/${programId}${item.href}`}
            className="flex flex-col items-center gap-1 px-4 text-xs text-zinc-600"
          >
            {item.label}
          </Link>
        ))}
        <Link href="/me" className="flex flex-col items-center gap-1 px-4 text-xs text-zinc-600">
          Me
        </Link>
      </nav>
    </div>
  );
}
