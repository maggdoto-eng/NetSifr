import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getProgressReport } from '@/modules/learning';

const POINTS_LABEL: Record<string, string> = {
  ATTENDANCE_CONFIRMED: 'Attendance',
  READING_COMPLETED: 'Readings',
  QUIZ_SCORED: 'Quizzes',
  ASSIGNMENT_SUBMITTED: 'Assignments submitted',
  ASSIGNMENT_GRADED: 'Assignments graded',
  EVENT_ATTENDED: 'Events',
  VOLUNTEER_HOURS_VERIFIED: 'Volunteering',
};
const GRADE_LABEL: Record<string, string> = {
  NEEDS_WORK: 'Needs work',
  GOOD: 'Good',
  EXCELLENT: 'Excellent',
};
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

export default async function ProgressPage({ params }: PageProps<'/programs/[programId]/progress'>) {
  const { programId } = await params;
  const { userId } = await verifySession();
  const report = await getProgressReport(userId, programId);

  const graded = report.items.filter((m) => m.type === 'QUIZ' || m.type === 'ASSIGNMENT');

  return (
    <div className="stack">
      <h1 className="display-md">Your progress</h1>

      <div className="a-stats">
        <div className="a-stat a-stat--dark">
          <div className="a-stat__value">{report.points.toLocaleString()}</div>
          <div className="mono" style={{ marginTop: 6 }}>
            Points earned
          </div>
        </div>
        <div className="a-stat">
          <div className="a-stat__value">{report.attendancePercent}%</div>
          <div className="mono" style={{ marginTop: 6 }}>
            Attendance · {report.attendanceConfirmed}/{report.attendanceTotal}
          </div>
        </div>
        <div className="a-stat">
          <div className="a-stat__value">{graded.length}</div>
          <div className="mono" style={{ marginTop: 6 }}>
            Graded items
          </div>
        </div>
      </div>

      {report.pointsByType.length > 0 && (
        <div className="card stack">
          <div className="title">Where your points came from</div>
          {report.pointsByType.map((p) => (
            <div key={p.type} className="row row--between">
              <span>{POINTS_LABEL[p.type] ?? p.type}</span>
              <span className="figure">{p.points.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <div className="stack">
        <div className="title">Graded work</div>
        {graded.length === 0 ? (
          <div className="empty">No quizzes or assignments released yet.</div>
        ) : (
          graded.map((m) => {
            const href = `/programs/${programId}/weeks/${m.weekId}/${m.route}/${m.moduleId}`;
            return (
              <div key={m.moduleId} className="card stack" style={{ gap: 'var(--s2)' }}>
                <div className="row">
                  <span className={`mod-icon ${MOD_ICON_CLS[m.type] ?? ''}`}>
                    {MODULE_ICON[m.type]}
                  </span>
                  <div className="grow">
                    <Link href={href} className="truncate" style={{ fontWeight: 600, color: 'inherit' }}>
                      {m.moduleTitle}
                    </Link>
                    <div className="mono" style={{ marginTop: 2 }}>
                      {m.weekTitle}
                    </div>
                  </div>
                  {m.type === 'QUIZ' ? (
                    m.quizBest !== null ? (
                      <span className="pill pill--done">Best {m.quizBest}%</span>
                    ) : (
                      <span className="pill pill--due">Not taken</span>
                    )
                  ) : m.gradeLabel ? (
                    <span className="pill pill--done">{GRADE_LABEL[m.gradeLabel] ?? m.gradeLabel}</span>
                  ) : (
                    <span className="pill pill--due">Not graded</span>
                  )}
                </div>
                {m.type === 'ASSIGNMENT' && m.gradeFeedback && (
                  <div className={`review ${m.gradeLabel !== 'NEEDS_WORK' ? 'review--ok' : ''}`}>
                    <p style={{ margin: 0 }}>{m.gradeFeedback}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
