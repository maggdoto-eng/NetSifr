import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { computeModuleState } from '@/modules/learning';

export default async function WeeksPage({ params }: PageProps<'/programs/[programId]/weeks'>) {
  const { programId } = await params;
  const { userId } = await verifySession();

  const cohort = await prisma.cohort.findUnique({
    where: { id: programId },
    include: { opportunity: true },
  });
  if (!cohort) notFound();

  const sessions = await prisma.cohortSession.findMany({
    where: { cohortId: programId },
    orderBy: { startsOn: 'asc' },
    include: { week: { include: { modules: { where: { isPublished: true } } } } },
  });

  const rows = await Promise.all(
    sessions.map(async (session) => {
      const states = await Promise.all(
        session.week.modules.map((m) => computeModuleState(userId, m)),
      );
      const total = states.length;
      const done = states.filter((s) => s.tone === 'done').length;
      return { session, total, done };
    }),
  );

  return (
    <div className="stack">
      <h1 className="display-md">All weeks</h1>

      <div className="stack">
        {rows.map(({ session, total, done }, index) => (
          <Link
            key={session.id}
            href={`/programs/${programId}/weeks/${session.weekId}`}
            className="card card--pick row"
          >
            <span
              className="figure"
              style={{
                width: 32,
                height: 32,
                flex: 'none',
                display: 'grid',
                placeItems: 'center',
                borderRadius: 10,
                background: 'var(--bg-sunk)',
                fontSize: 13,
              }}
            >
              {index + 1}
            </span>
            <div className="grow">
              <div className="truncate" style={{ fontWeight: 600 }}>
                {session.week.title}
              </div>
              <div className="mono" style={{ marginTop: 2 }}>
                {total > 0 ? `${done}/${total} done` : 'Not published yet'}
              </div>
            </div>
            <span
              className={`rail__dot ${total > 0 && done === total ? 'rail__dot--done' : ''}`}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
