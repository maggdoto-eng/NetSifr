import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { getSyllabus, computeUserAttendancePercent } from '@/modules/learning';
import { getCohortPoints, getCohortStreak } from '@/modules/recognition';

const MODULE_ICON: Record<string, string> = {
  RECORDING: '▶',
  READING: '▤',
  QUIZ: '◉',
  ASSIGNMENT: '✎',
};
const MOD_ICON_CLS: Record<string, string> = {
  RECORDING: 'mod-icon--recording',
  READING: 'mod-icon--reading',
  QUIZ: 'mod-icon--quiz',
  ASSIGNMENT: 'mod-icon--assignment',
};

function dueLabel(dueInDays: number | null): { text: string; urgent: boolean } | null {
  if (dueInDays === null) return null;
  if (dueInDays < 0) return { text: `Overdue ${-dueInDays}d`, urgent: true };
  if (dueInDays === 0) return { text: 'Due today', urgent: true };
  if (dueInDays <= 3) return { text: `Due in ${dueInDays}d`, urgent: true };
  return { text: `Due in ${dueInDays}d`, urgent: false };
}

export default async function ProgramHomePage({ params }: PageProps<'/programs/[programId]'>) {
  const { programId } = await params;
  const { userId } = await verifySession();

  const cohort = await prisma.cohort.findUnique({ where: { id: programId } });
  if (!cohort) notFound();

  const [user, syllabus, attendancePercent, points, streak] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    getSyllabus(userId, programId),
    computeUserAttendancePercent(userId, programId),
    getCohortPoints(userId, programId),
    getCohortStreak(userId, programId),
  ]);

  const currentWeek = syllabus.weeks.find((w) => w.current);
  const next = syllabus.nextModule;
  const nextHref = next
    ? `/programs/${programId}/weeks/${next.weekId}/${next.route}/${next.moduleId}`
    : null;
  // deadline for the up-next card, if any
  const nextSyl = next
    ? syllabus.weeks.flatMap((w) => w.modules).find((m) => m.id === next.moduleId)
    : undefined;
  const nextDue = nextSyl ? dueLabel(nextSyl.dueInDays) : null;
  const allDone = syllabus.total > 0 && syllabus.done === syllabus.total;

  return (
    <div className="stack">
      {/* Progress hero */}
      <div className="p-hero contour">
        <div className="mono mono--onDark">
          {currentWeek ? currentWeek.title : 'Getting started'}
        </div>
        <h1 className="display-md" style={{ color: 'var(--fg-on-dark)', marginTop: 6 }}>
          Salaam, {user.name.split(' ')[0]}
        </h1>

        <div style={{ marginTop: 'var(--s5)' }}>
          <div className="row row--between" style={{ marginBottom: 8 }}>
            <span className="mono mono--onDark">Course progress</span>
            <span className="figure" style={{ color: 'var(--fg-on-dark)', fontSize: 14 }}>
              {syllabus.done}/{syllabus.total} · {syllabus.percent}%
            </span>
          </div>
          <div className="bar bar--onDark">
            <i style={{ width: `${syllabus.percent}%` }} />
          </div>
        </div>

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

        {nextHref ? (
          <Link
            href={nextHref}
            className="btn btn--accent btn--block"
            style={{ marginTop: 'var(--s5)' }}
          >
            {syllabus.done === 0 ? 'Start the course →' : 'Continue where you left off →'}
          </Link>
        ) : allDone ? (
          <div
            className="mono mono--onDark"
            style={{ marginTop: 'var(--s5)', textAlign: 'center' }}
          >
            🎉 You’re all caught up on released content
          </div>
        ) : null}
      </div>

      {/* Up next */}
      {next && (
        <div>
          <div className="mono" style={{ marginBottom: 'var(--s2)' }}>
            Up next
          </div>
          <Link href={nextHref!} className="mod-row mod-row--flag">
            <span className={`mod-icon ${MOD_ICON_CLS[next.type] ?? ''}`}>
              {MODULE_ICON[next.type]}
            </span>
            <div className="grow">
              <div className="truncate" style={{ fontWeight: 600 }}>
                {next.title}
              </div>
              <div className="mono" style={{ marginTop: 2 }}>
                {next.type}
              </div>
            </div>
            {nextDue && (
              <span className={nextDue.urgent ? 'pill pill--due' : 'pill'}>{nextDue.text}</span>
            )}
          </Link>
        </div>
      )}

      {/* This week */}
      {currentWeek && currentWeek.modules.length > 0 && (
        <div className="stack">
          <div className="mono">This week · {currentWeek.title}</div>
          {currentWeek.modules.map((m) => {
            const href = `/programs/${programId}/weeks/${currentWeek.id}/${m.route}/${m.id}`;
            const due = dueLabel(m.dueInDays);
            return (
              <Link key={m.id} href={href} className="mod-row">
                <span className={`mod-icon ${MOD_ICON_CLS[m.type] ?? ''}`}>
                  {MODULE_ICON[m.type]}
                </span>
                <div className="grow">
                  <div className="truncate" style={{ fontWeight: 600 }}>
                    {m.title}
                  </div>
                  {due && (
                    <div
                      className="mono"
                      style={{ marginTop: 2, color: due.urgent ? 'var(--coral)' : 'var(--mute)' }}
                    >
                      {due.text}
                    </div>
                  )}
                </div>
                {m.state && (
                  <span className={m.state.tone === 'done' ? 'pill pill--done' : 'pill'}>
                    {m.state.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Course outline */}
      <div className="stack">
        <div className="row row--between">
          <div className="mono">Course outline</div>
          <Link href={`/programs/${programId}/weeks`} className="mono" style={{ color: 'var(--coral)' }}>
            Full syllabus →
          </Link>
        </div>
        <div className="card" style={{ padding: 'var(--s2)' }}>
          {syllabus.weeks.map((w, i) => (
            <Link
              key={w.id}
              href={w.released ? `/programs/${programId}/weeks/${w.id}` : `/programs/${programId}/weeks`}
              className="rail__item"
              aria-current={w.current ? 'true' : undefined}
              data-locked={!w.released ? 'true' : undefined}
            >
              <span className="rail__n">{String(i + 1).padStart(2, '0')}</span>
              <div className="grow">
                <div className="truncate" style={{ fontWeight: w.current ? 600 : 400 }}>
                  {w.title}
                </div>
              </div>
              {!w.released ? (
                <span className="mono">Locked</span>
              ) : (
                <span className="mono">
                  {w.done}/{w.total}
                </span>
              )}
              <span
                className={`rail__dot ${
                  w.released && w.total > 0 && w.done === w.total
                    ? 'rail__dot--done'
                    : w.current
                      ? 'rail__dot--current'
                      : ''
                }`}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
