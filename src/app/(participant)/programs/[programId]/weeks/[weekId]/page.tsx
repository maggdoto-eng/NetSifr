import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { getPublishedModulesForWeek, computeModuleState } from '@/modules/learning';

const MODULE_ROUTE: Record<string, string> = {
  RECORDING: 'recording',
  READING: 'reading',
  QUIZ: 'quiz',
  ASSIGNMENT: 'assignment',
};

const MODULE_ICON: Record<string, string> = {
  RECORDING: '▶',
  READING: '▤',
  QUIZ: '◉',
  ASSIGNMENT: '✎',
};

export default async function WeekDetailPage({
  params,
}: PageProps<'/programs/[programId]/weeks/[weekId]'>) {
  const { programId, weekId } = await params;
  const { userId } = await verifySession();

  const week = await prisma.week.findUnique({ where: { id: weekId } });
  if (!week) notFound();

  const modules = await getPublishedModulesForWeek(weekId);
  const moduleRows = await Promise.all(
    modules.map(async (module_) => ({
      ...module_,
      state: await computeModuleState(userId, module_),
    })),
  );

  return (
    <div className="flex flex-col gap-4 p-5">
      <div>
        <Link href={`/programs/${programId}/weeks`} className="text-xs text-zinc-500 underline">
          ← All weeks
        </Link>
        <h1 className="mt-2 text-xl font-bold">{week.title}</h1>
      </div>

      <div className="flex flex-col gap-2">
        {moduleRows.map((module_) => (
          <Link
            key={module_.id}
            href={`/programs/${programId}/weeks/${weekId}/${MODULE_ROUTE[module_.type]}/${module_.id}`}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-zinc-100">
              {MODULE_ICON[module_.type]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[9px] tracking-wide text-zinc-500">{module_.type}</div>
              <div className="truncate text-sm font-semibold">{module_.title}</div>
            </div>
            <span className="rounded px-2 py-0.5 font-mono text-[10px] text-zinc-600">
              {module_.state.label}
            </span>
          </Link>
        ))}
        {moduleRows.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500">
            Nothing published for this week yet.
          </p>
        )}
      </div>

      <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
        Nothing locks — late work is accepted and flagged for your facilitator.
      </div>
    </div>
  );
}
