import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { getEnrolment } from '@/modules/learning';
import { ProgramTabs } from './program-tabs';

export default async function ProgramLayout({
  children,
  params,
}: LayoutProps<'/programs/[programId]'>) {
  const { programId } = await params;
  const { userId } = await verifySession();

  // Active and completed enrolments can both view the program (completed is
  // read-only + gets the certificate). Withdrawn/declined cannot.
  const enrolment = await getEnrolment(userId, programId);
  if (!enrolment || (enrolment.status !== 'ACTIVE' && enrolment.status !== 'COMPLETED')) {
    notFound();
  }

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
