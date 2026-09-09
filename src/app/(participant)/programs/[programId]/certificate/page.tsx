import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { getEnrolment, computeUserAttendancePercent } from '@/modules/learning';
import { getCohortPoints } from '@/modules/recognition';
import { PrintButton } from './print-button';

export default async function CertificatePage({
  params,
}: PageProps<'/programs/[programId]/certificate'>) {
  const { programId } = await params;
  const { userId } = await verifySession();

  const enrolment = await getEnrolment(userId, programId);
  if (!enrolment) notFound();

  const cohort = await prisma.cohort.findUnique({
    where: { id: programId },
    include: { opportunity: { select: { title: true } }, organization: { select: { name: true } } },
  });
  if (!cohort) notFound();

  if (enrolment.status !== 'COMPLETED') {
    return (
      <div className="stack">
        <h1 className="display-md">Certificate</h1>
        <div className="empty">
          Your certificate unlocks when the program is marked complete. Keep going — you’re not far
          off.
        </div>
        <Link href={`/programs/${programId}`} className="btn btn--ghost self-start">
          ← Back to the program
        </Link>
      </div>
    );
  }

  const [user, attendancePercent, points] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    computeUserAttendancePercent(userId, programId),
    getCohortPoints(userId, programId),
  ]);

  const completedOn = (enrolment.completedAt ?? new Date()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="stack">
      <div className="row row--between no-print">
        <Link href={`/programs/${programId}`} className="mono" style={{ color: 'var(--mute)' }}>
          ← Back to the program
        </Link>
        <PrintButton />
      </div>

      <div className="certificate contour">
        <div className="mono mono--coral">{cohort.organization.name}</div>
        <div className="display-lg" style={{ marginTop: 'var(--s4)', color: 'var(--pine)' }}>
          Certificate of Completion
        </div>
        <div className="muted" style={{ marginTop: 'var(--s5)' }}>
          This certifies that
        </div>
        <div className="display-xl" style={{ marginTop: 'var(--s2)' }}>
          {user.name}
        </div>
        <div className="muted" style={{ marginTop: 'var(--s4)' }}>
          has successfully completed
        </div>
        <div className="display-md" style={{ marginTop: 'var(--s2)' }}>
          {cohort.opportunity.title}
        </div>
        <div className="mono" style={{ marginTop: 6 }}>
          {cohort.cohortLabel} · completed {completedOn}
        </div>

        <div
          className="row"
          style={{ justifyContent: 'center', gap: 'var(--s7)', marginTop: 'var(--s7)' }}
        >
          <div>
            <div className="figure" style={{ fontSize: 26, color: 'var(--pine)' }}>
              {attendancePercent}%
            </div>
            <div className="mono">Attendance</div>
          </div>
          <div>
            <div className="figure" style={{ fontSize: 26, color: 'var(--coral)' }}>
              {points.toLocaleString()}
            </div>
            <div className="mono">Points earned</div>
          </div>
        </div>

        <div
          className="mono"
          style={{ marginTop: 'var(--s7)', color: 'var(--mute)' }}
        >
          Issued by {cohort.organization.name} · NetSifr
        </div>
      </div>
    </div>
  );
}
