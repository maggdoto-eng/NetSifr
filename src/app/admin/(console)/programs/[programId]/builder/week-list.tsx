import Link from 'next/link';
import { addWeekAction, moveWeekAction } from './actions';

export function WeekList(props: {
  programId: string;
  courseVersionId: string;
  weeks: Array<{ id: string; orderIndex: number; title: string; moduleCount: number }>;
  selectedWeekId: string | undefined;
  locked: boolean;
}) {
  const { programId, courseVersionId, weeks, selectedWeekId, locked } = props;

  return (
    <div className="builder__weeks">
      <div className="row row--between" style={{ padding: '0 4px var(--s3)' }}>
        <span className="mono">Weeks · {weeks.length}</span>
        {!locked && (
          <form action={addWeekAction.bind(null, courseVersionId, programId)}>
            <button type="submit" className="mono mono--coral" style={{ fontWeight: 700 }}>
              + Add
            </button>
          </form>
        )}
      </div>

      <div className="col" style={{ gap: 2 }}>
        {weeks.map((week, index) => (
          <div
            key={week.id}
            className="week-item"
            aria-current={week.id === selectedWeekId ? 'true' : undefined}
          >
            <span className="grip" aria-hidden>
              ⠿
            </span>
            <span className="week-item__n">{String(index + 1).padStart(2, '0')}</span>
            <Link
              href={`/admin/programs/${programId}/builder?week=${week.id}`}
              className="grow truncate"
              style={{ color: 'inherit' }}
            >
              {week.title}
            </Link>
            <span className="mono">{week.moduleCount}</span>
            {!locked && (
              <span className="col" style={{ gap: 0, marginLeft: 4 }}>
                <form
                  action={moveWeekAction.bind(null, {
                    courseVersionId,
                    weekId: week.id,
                    direction: 'up',
                    programId,
                  })}
                >
                  <button
                    type="submit"
                    disabled={index === 0}
                    aria-label="Move week up"
                    style={{ fontSize: 9, opacity: index === 0 ? 0.3 : 0.6 }}
                  >
                    ▲
                  </button>
                </form>
                <form
                  action={moveWeekAction.bind(null, {
                    courseVersionId,
                    weekId: week.id,
                    direction: 'down',
                    programId,
                  })}
                >
                  <button
                    type="submit"
                    disabled={index === weeks.length - 1}
                    aria-label="Move week down"
                    style={{ fontSize: 9, opacity: index === weeks.length - 1 ? 0.3 : 0.6 }}
                  >
                    ▼
                  </button>
                </form>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
