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
    <div className="flex w-72 flex-none flex-col gap-2 overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[10px] tracking-wide text-zinc-500">
          WEEKS · {weeks.length}
        </span>
        {!locked && (
          <form action={addWeekAction.bind(null, courseVersionId, programId)}>
            <button type="submit" className="font-mono text-xs font-semibold text-orange-600">
              + ADD
            </button>
          </form>
        )}
      </div>

      {weeks.map((week, index) => (
        <div
          key={week.id}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
            week.id === selectedWeekId ? 'bg-zinc-900 text-white' : 'bg-white'
          }`}
        >
          <Link
            href={`/admin/programs/${programId}/builder?week=${week.id}`}
            className="min-w-0 flex-1"
          >
            <div className="truncate text-sm font-medium">
              {index + 1}. {week.title}
            </div>
            <div
              className={`font-mono text-[10px] ${week.id === selectedWeekId ? 'text-zinc-300' : 'text-zinc-500'}`}
            >
              {week.moduleCount} module{week.moduleCount === 1 ? '' : 's'}
            </div>
          </Link>
          {!locked && (
            <div className="flex flex-none flex-col">
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
                  className={`text-xs disabled:opacity-30 ${week.id === selectedWeekId ? 'text-white' : ''}`}
                  aria-label="Move week up"
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
                  className={`text-xs disabled:opacity-30 ${week.id === selectedWeekId ? 'text-white' : ''}`}
                  aria-label="Move week down"
                >
                  ▼
                </button>
              </form>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
