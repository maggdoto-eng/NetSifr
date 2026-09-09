import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import {
  getCurrentCohortSession,
  getPublishedModulesForWeek,
  computeModuleState,
  computeUserAttendancePercent,
} from '@/modules/learning';
import { getCohortPoints, getCohortStreak } from '@/modules/recognition';

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

export default async function ProgramHomePage({ params }: PageProps<'/programs/[programId]'>) {
  const { programId } = await params;
  const { userId } = await verifySession();

  const cohort = await prisma.cohort.findUnique({
    where: { id: programId },
    include: { opportunity: true },
  });
  if (!cohort) notFound();

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const currentSession = await getCurrentCohortSession(programId);
  const [attendancePercent, points, streak] = await Promise.all([
    computeUserAttendancePercent(userId, programId),
    getCohortPoints(userId, programId),
    getCohortStreak(userId, programId),
  ]);

  const modules = currentSession ? await getPublishedModulesForWeek(currentSession.weekId) : [];
  const moduleRows = await Promise.all(
    modules.map(async (module_) => ({
      ...module_,
      state: await computeModuleState(userId, module_),
    })),
  );
  const recording = moduleRows.find((m) => m.type === 'RECORDING');

  const MOD_ICON_CLS: Record<string, string> = {
    RECORDING: 'mod-icon--recording',
    READING: 'mod-icon--reading',
    QUIZ: 'mod-icon--quiz',
    ASSIGNMENT: 'mod-icon--assignment',
  };

  return (
    <div className="stack">
      <div className="p-hero contour">
        <div className="mono mono--onDark">
          {currentSession ? currentSession.week.title : 'Not started'}
        </div>
        <h1 className="display-md" style={{ color: 'var(--fg-on-dark)', marginTop: 6 }}>
          Salaam, {user.name.split(' ')[0]}
        </h1>
        <div className="p-hero__stats" style={{ marginTop: 'var(--s5)' }}>
          <div className="p-stat p-stat--attend">
            <div className="p-stat__value">{attendancePercent}%</div>
            <div className="mono mono--onDark" style={{ marginTop: 4 }}>
              Attendance
            </div>
          </div>
          <div className="p-stat p-stat--points">
            <div className="p-stat__value">{points.toLocaleString()}</div>
            <div className="mono mono--onDark" style={{ marginTop: 4 }}>
              Points
            </div>
          </div>
          <div className="p-stat">
            <div className="p-stat__value" style={{ color: 'var(--fg-on-dark)' }}>
              {streak}🔥
            </div>
            <div className="mono mono--onDark" style={{ marginTop: 4 }}>
              Streak
            </div>
          </div>
        </div>
      </div>

      {recording && currentSession && (
        <Link
          href={`/programs/${programId}/weeks/${currentSession.weekId}/recording/${recording.id}`}
          className="card card--pick"
          style={{ padding: 0, overflow: 'hidden' }}
        >
          <div className="placeholder" style={{ height: 150, borderRadius: 0 }}>
            <span className="play">▶</span>
            <span className="mono mono--onDark">Watch to unlock attendance</span>
          </div>
          <div style={{ padding: 'var(--s4)' }}>
            <div className="mono mono--coral">This week · Recording</div>
            <div className="display-sm" style={{ marginTop: 6 }}>
              {currentSession.week.title}
            </div>
          </div>
        </Link>
      )}

      <div className="mono">This week’s modules</div>
      <div className="stack">
        {moduleRows.map((module_) => (
          <Link
            key={module_.id}
            href={`/programs/${programId}/weeks/${currentSession!.weekId}/${MODULE_ROUTE[module_.type]}/${module_.id}`}
            className="mod-row"
          >
            <span className={`mod-icon ${MOD_ICON_CLS[module_.type] ?? ''}`}>
              {MODULE_ICON[module_.type]}
            </span>
            <div className="grow">
              <div className="truncate" style={{ fontWeight: 600 }}>
                {module_.title}
              </div>
            </div>
            <span className="pill">{module_.state.label}</span>
          </Link>
        ))}
        {moduleRows.length === 0 && <div className="empty">Nothing published for this week yet.</div>}
      </div>
    </div>
  );
}
