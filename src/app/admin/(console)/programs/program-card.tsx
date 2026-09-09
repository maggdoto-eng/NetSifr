import Link from 'next/link';
import { duplicateProgramAction, publishProgramAction, archiveProgramAction } from './actions';

const MARK_COLORS = ['#86E5BC', '#FF6A45', '#123B2E', '#E3D9C2'];

const STATUS_PILL: Record<string, string> = {
  DRAFT: 'pill pill--draft',
  LIVE: 'pill pill--live',
  ARCHIVED: 'pill pill--archived',
};

export function ProgramCard(props: {
  cohortId: string;
  title: string;
  cohortLabel: string;
  status: 'DRAFT' | 'LIVE' | 'ARCHIVED';
  enrolledCount: number;
  weekCount: number;
  attendanceAverage: number | null;
  index: number;
}) {
  const { cohortId, title, cohortLabel, status, enrolledCount, weekCount, attendanceAverage } =
    props;

  return (
    <div className="card prog-tile">
      <div className="row row--between">
        <span className="mark" style={{ background: MARK_COLORS[props.index % MARK_COLORS.length] }} />
        <span className={STATUS_PILL[status]}>{status}</span>
      </div>

      <div>
        <h3 className="display-sm">{title}</h3>
        <div className="mono" style={{ marginTop: 6 }}>
          {cohortLabel}
        </div>
      </div>

      <div className="prog-tile__figures">
        <div className="prog-tile__figure">
          <div className="v">{enrolledCount}</div>
          <div className="mono">Enrolled</div>
        </div>
        <div className="prog-tile__figure">
          <div className="v">{weekCount}</div>
          <div className="mono">Weeks</div>
        </div>
        <div className="prog-tile__figure">
          <div className="v">{attendanceAverage === null ? '—' : `${attendanceAverage}%`}</div>
          <div className="mono">Attendance</div>
        </div>
      </div>

      <div className="row" style={{ gap: 'var(--s2)' }}>
        <Link href={`/admin/programs/${cohortId}/builder`} className="btn btn--primary btn--sm">
          Open
        </Link>
        <form action={duplicateProgramAction.bind(null, cohortId)}>
          <button type="submit" className="btn btn--ghost btn--sm">
            Duplicate
          </button>
        </form>
        {status === 'DRAFT' && (
          <form action={publishProgramAction.bind(null, cohortId)}>
            <button type="submit" className="btn btn--ghost btn--sm">
              Publish
            </button>
          </form>
        )}
        {status === 'LIVE' && (
          <form action={archiveProgramAction.bind(null, cohortId)}>
            <button type="submit" className="btn btn--ghost btn--sm">
              Archive
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
