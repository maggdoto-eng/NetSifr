import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { getSyllabus } from '@/modules/learning';

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

function fmt(d: Date | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function WeeksPage({ params }: PageProps<'/programs/[programId]/weeks'>) {
  const { programId } = await params;
  const { userId } = await verifySession();

  const cohort = await prisma.cohort.findUnique({ where: { id: programId } });
  if (!cohort) notFound();

  const syllabus = await getSyllabus(userId, programId);

  return (
    <div className="stack">
      <div>
        <h1 className="display-md">Syllabus</h1>
        <div style={{ marginTop: 'var(--s4)' }}>
          <div className="row row--between" style={{ marginBottom: 6 }}>
            <span className="mono">Overall progress</span>
            <span className="figure" style={{ fontSize: 14 }}>
              {syllabus.done}/{syllabus.total} · {syllabus.percent}%
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${syllabus.percent}%` }} />
          </div>
        </div>
      </div>

      {syllabus.weeks.map((w, i) => {
        const dates =
          fmt(w.startsOn) && fmt(w.endsOn)
            ? `${fmt(w.startsOn)} – ${fmt(w.endsOn)}`
            : 'Dates TBC';
        const complete = w.released && w.total > 0 && w.done === w.total;
        return (
          <div key={w.id} className={`card stack ${w.current ? 'card--sel' : ''}`}>
            <div className="row row--between wrap">
              <div className="row" style={{ gap: 'var(--s3)' }}>
                <span className="rail__n">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div className="title">{w.title}</div>
                  <div className="mono" style={{ marginTop: 2 }}>
                    {dates}
                  </div>
                </div>
              </div>
              {!w.released ? (
                <span className="pill pill--draft">Locked</span>
              ) : complete ? (
                <span className="pill pill--done">Complete · {w.done}/{w.total}</span>
              ) : w.current ? (
                <span className="pill pill--due">
                  Current · {w.done}/{w.total}
                </span>
              ) : (
                <span className="pill">
                  {w.done}/{w.total} done
                </span>
              )}
            </div>

            {w.modules.length > 0 && (
              <div className="stack" style={{ gap: 'var(--s2)' }}>
                {w.modules.map((m) => {
                  const inner = (
                    <>
                      <span className={`mod-icon ${MOD_ICON_CLS[m.type] ?? ''}`}>
                        {MODULE_ICON[m.type]}
                      </span>
                      <div className="grow">
                        <div className="truncate" style={{ fontWeight: 500 }}>
                          {m.title}
                        </div>
                        <div className="mono" style={{ marginTop: 2 }}>
                          {m.type}
                        </div>
                      </div>
                      {m.locked ? (
                        <span className="mono">Locked</span>
                      ) : m.state ? (
                        <span className={m.state.tone === 'done' ? 'pill pill--done' : 'pill'}>
                          {m.state.label}
                        </span>
                      ) : null}
                    </>
                  );
                  return m.locked ? (
                    <div key={m.id} className="row" style={{ padding: '10px 4px', opacity: 0.55 }}>
                      {inner}
                    </div>
                  ) : (
                    <Link
                      key={m.id}
                      href={`/programs/${programId}/weeks/${w.id}/${m.route}/${m.id}`}
                      className="row"
                      style={{ padding: '10px 4px', color: 'inherit' }}
                    >
                      {inner}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
