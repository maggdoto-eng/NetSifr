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

  const MOD_ICON_CLS: Record<string, string> = {
    RECORDING: 'mod-icon--recording',
    READING: 'mod-icon--reading',
    QUIZ: 'mod-icon--quiz',
    ASSIGNMENT: 'mod-icon--assignment',
  };

  return (
    <div className="stack">
      <div>
        <Link href={`/programs/${programId}/weeks`} className="mono" style={{ color: 'var(--mute)' }}>
          ← All weeks
        </Link>
        <h1 className="display-md" style={{ marginTop: 6 }}>
          {week.title}
        </h1>
      </div>

      <div className="stack">
        {moduleRows.map((module_) => (
          <Link
            key={module_.id}
            href={`/programs/${programId}/weeks/${weekId}/${MODULE_ROUTE[module_.type]}/${module_.id}`}
            className="mod-row"
          >
            <span className={`mod-icon ${MOD_ICON_CLS[module_.type] ?? ''}`}>
              {MODULE_ICON[module_.type]}
            </span>
            <div className="grow">
              <div className="mono">{module_.type}</div>
              <div className="truncate" style={{ fontWeight: 600, marginTop: 2 }}>
                {module_.title}
              </div>
            </div>
            <span className="pill">{module_.state.label}</span>
          </Link>
        ))}
        {moduleRows.length === 0 && <div className="empty">Nothing published for this week yet.</div>}
      </div>

      <div className="card card--notice">
        Nothing locks — late work is accepted and flagged for your facilitator.
      </div>
    </div>
  );
}
