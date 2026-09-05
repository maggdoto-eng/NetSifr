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

  return (
    <div className="flex flex-col">
      <header className="ns-hero px-[22px] pb-[22px] pt-5">
        <Link
          href="/programs"
          className="ns-label inline-flex items-center gap-2 self-start rounded-full bg-[rgba(245,242,234,0.09)] px-2.5 py-1.5 text-[9.5px] tracking-[0.1em] text-cream"
        >
          <span className="truncate">{cohort.opportunity.title}</span>
          <span className="text-mint">⇄</span>
        </Link>
        <div className="mt-3.5 flex items-center justify-between">
          <div className="min-w-0">
            <div className="ns-label text-mint">
              {currentSession ? currentSession.week.title : 'Not started'}
            </div>
            <div className="mt-1 text-[24px] leading-tight text-cream">
              Salaam, {user.name.split(' ')[0]}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-[15px] bg-[rgba(134,229,188,0.12)] p-3">
            <div className="font-mono text-[20px] font-semibold text-mint">
              {attendancePercent}%
            </div>
            <div className="ns-label mt-0.5 text-[9px] tracking-[0.12em] text-[rgba(245,242,234,0.55)]">
              Attendance
            </div>
          </div>
          <div className="rounded-[15px] bg-[rgba(255,106,69,0.16)] p-3">
            <div className="font-mono text-[20px] font-semibold text-[#FF8B6D]">
              {points.toLocaleString()}
            </div>
            <div className="ns-label mt-0.5 text-[9px] tracking-[0.12em] text-[rgba(245,242,234,0.55)]">
              Points
            </div>
          </div>
          <div className="rounded-[15px] bg-[rgba(245,242,234,0.08)] p-3">
            <div className="font-mono text-[20px] font-semibold text-cream">{streak}🔥</div>
            <div className="ns-label mt-0.5 text-[9px] tracking-[0.12em] text-[rgba(245,242,234,0.55)]">
              Streak
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3.5 p-[22px]">
        {recording && (
          <Link
            href={`/programs/${programId}/weeks/${currentSession!.weekId}/recording/${recording.id}`}
            className="ns-card overflow-hidden"
          >
            <div
              className="flex h-[120px] flex-col items-center justify-center gap-2"
              style={{
                background: 'repeating-linear-gradient(45deg, #123B2E 0 10px, #16493a 10px 20px)',
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral text-[#FFF7F2]">
                ▶
              </div>
              <div className="ns-label text-[9px] tracking-[0.12em] text-mint">Watch to unlock</div>
            </div>
            <div className="flex flex-col gap-2 p-[15px]">
              <div className="ns-label text-[10px] tracking-[0.13em] text-coral">
                This week · Recording
              </div>
              <div className="text-[19px] font-extrabold leading-tight tracking-[-0.02em]">
                {currentSession!.week.title}
              </div>
            </div>
          </Link>
        )}

        <div className="ns-label mt-1 text-[#4A6258]">This week&apos;s modules</div>
        <div className="flex flex-col gap-2.5">
          {moduleRows.map((module_) => (
            <Link
              key={module_.id}
              href={`/programs/${programId}/weeks/${currentSession!.weekId}/${MODULE_ROUTE[module_.type]}/${module_.id}`}
              className="ns-card flex items-center gap-3 p-3.5"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[11px] bg-[rgba(16,36,30,0.06)] text-[#123B2E]">
                {MODULE_ICON[module_.type]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{module_.title}</div>
              </div>
              <span className="ns-label rounded-full bg-[rgba(16,36,30,0.06)] px-2.5 py-1 text-[9px] text-[#4A6258]">
                {module_.state.label}
              </span>
            </Link>
          ))}
          {moduleRows.length === 0 && (
            <p className="rounded-2xl border-[1.5px] border-dashed border-[rgba(16,36,30,0.22)] p-5 text-center text-sm text-[#4A6258]">
              Nothing published for this week yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
