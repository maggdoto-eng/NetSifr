import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { getActiveEnrolment } from '@/modules/learning';
import { ProgramTabs } from './program-tabs';

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
    <div>
      <div
        style={{
          borderBottom: '1.5px solid var(--border)',
          background: 'var(--bg-card)',
          position: 'sticky',
          top: 'var(--topbar-h)',
          zIndex: 10,
        }}
      >
        <div
          className="shell row row--between wrap"
          style={{ paddingTop: 'var(--s4)', paddingBottom: 'var(--s4)', gap: 'var(--s4)' }}
        >
          <div className="row" style={{ gap: 'var(--s3)', minWidth: 0 }}>
            <Link href="/programs" className="mono" style={{ color: 'var(--mute)' }}>
              ← All programs
            </Link>
            <span className="title truncate">{cohort.opportunity.title}</span>
          </div>
          <ProgramTabs programId={programId} />
        </div>
      </div>
      <div className="shell" style={{ maxWidth: 860 }}>
        {children}
      </div>
    </div>
  );
}
