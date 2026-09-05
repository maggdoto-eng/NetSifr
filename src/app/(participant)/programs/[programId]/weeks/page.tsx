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
    <div className="flex flex-col gap-4 p-5">
      <div>
        <div className="font-mono text-[10px] tracking-wide text-zinc-500">
          {cohort.opportunity.title.toUpperCase()}
        </div>
        <h1 className="mt-1 text-xl font-bold">All weeks</h1>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map(({ session, total, done }, index) => (
          <Link
            key={session.id}
            href={`/programs/${programId}/weeks/${session.weekId}`}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3"
          >
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-zinc-100 font-mono text-sm font-semibold">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{session.week.title}</div>
              <div className="font-mono text-[10px] text-zinc-500">
                {total > 0 ? `${done}/${total} DONE` : 'NOT PUBLISHED YET'}
              </div>
            </div>
            <div
              className={`h-2.5 w-2.5 flex-none rounded-full ${
                total > 0 && done === total ? 'bg-emerald-500' : 'bg-zinc-200'
              }`}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
