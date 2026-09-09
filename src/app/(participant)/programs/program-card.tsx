import Link from 'next/link';

// Per-program identity colour, assigned round-robin (mint → coral → pine → sand),
// exactly as the prototype's program "mark". Never a fifth colour.
export const MARK_COLORS = ['#86E5BC', '#FF6A45', '#123B2E', '#E3D9C2'];

type CardState = 'active' | 'completed' | 'notopen';

export function ProgramCard(props: {
  cohortId: string;
  title: string;
  meta: string;
  markColor: string;
  state: CardState;
  currentWeek?: number;
  progressPercent?: number;
  points?: number;
  attendancePercent?: number;
}) {
  const { state } = props;

  const statusPill =
    state === 'completed' ? (
      <span className="pill pill--done">Complete</span>
    ) : state === 'notopen' ? (
      <span className="pill pill--draft">Not open yet</span>
    ) : props.currentWeek ? (
      <span className="pill">Week {props.currentWeek}</span>
    ) : null;

  return (
    <Link
      href={`/programs/${props.cohortId}`}
      className="card card--pick col"
      style={{ gap: 'var(--s4)' }}
    >
      <div className="row row--top">
        <span className="mark" style={{ background: props.markColor }} />
        <div className="grow">
          <div className="display-sm" style={{ color: 'var(--coral)' }}>
            {props.title}
          </div>
          <div className="mono" style={{ marginTop: 6 }}>
            {props.meta}
          </div>
        </div>
        {statusPill}
      </div>

      {state === 'notopen' ? (
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>
          You’re enrolled. Sessions unlock when your facilitator publishes the program — we’ll
          email you.
        </p>
      ) : (
        <>
          <div className="row">
            <div className="bar grow">
              <i style={{ width: `${props.progressPercent ?? 0}%`, background: 'var(--pine)' }} />
            </div>
            <span className="figure" style={{ color: 'var(--coral)', fontSize: 14 }}>
              {props.progressPercent ?? 0}%
            </span>
          </div>
          <div className="mono">
            {(props.points ?? 0).toLocaleString()} points&nbsp;&nbsp;·&nbsp;&nbsp;
            {props.attendancePercent ?? 0}% attendance
          </div>
        </>
      )}
    </Link>
  );
}
