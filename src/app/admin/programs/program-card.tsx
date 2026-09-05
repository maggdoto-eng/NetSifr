import Link from 'next/link';
import { duplicateProgramAction, publishProgramAction, archiveProgramAction } from './actions';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  LIVE: 'bg-emerald-200 text-emerald-900',
  ARCHIVED: 'bg-zinc-800 text-zinc-100',
};

export function ProgramCard(props: {
  cohortId: string;
  title: string;
  cohortLabel: string;
  status: 'DRAFT' | 'LIVE' | 'ARCHIVED';
  enrolledCount: number;
  weekCount: number;
  attendanceAverage: number | null;
}) {
  const { cohortId, title, cohortLabel, status, enrolledCount, weekCount, attendanceAverage } =
    props;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded px-2 py-0.5 font-mono text-[10px] tracking-wide ${STATUS_STYLES[status]}`}
        >
          {status}
        </span>
      </div>
      <div>
        <h3 className="font-semibold leading-tight">{title}</h3>
        <p className="mt-1 font-mono text-[10px] tracking-wide text-zinc-500">
          {cohortLabel.toUpperCase()}
        </p>
      </div>
      <div className="flex gap-5 text-sm">
        <div>
          <div className="font-mono text-base font-semibold">{enrolledCount}</div>
          <div className="font-mono text-[9px] text-zinc-500">ENROLLED</div>
        </div>
        <div>
          <div className="font-mono text-base font-semibold">{weekCount}</div>
          <div className="font-mono text-[9px] text-zinc-500">WEEKS</div>
        </div>
        <div>
          <div className="font-mono text-base font-semibold">
            {attendanceAverage === null ? '—' : `${attendanceAverage}%`}
          </div>
          <div className="font-mono text-[9px] text-zinc-500">ATTEND</div>
        </div>
      </div>
      <div className="mt-1 flex gap-2">
        <Link
          href={`/admin/programs/${cohortId}/builder`}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          Open
        </Link>
        <form action={duplicateProgramAction.bind(null, cohortId)}>
          <button type="submit" className="rounded border border-zinc-300 px-3 py-1.5 text-sm">
            Duplicate
          </button>
        </form>
        {status !== 'ARCHIVED' && (
          <form
            action={(status === 'DRAFT' ? publishProgramAction : archiveProgramAction).bind(
              null,
              cohortId,
            )}
          >
            <button type="submit" className="rounded border border-zinc-300 px-3 py-1.5 text-sm">
              {status === 'DRAFT' ? 'Publish' : 'Archive'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
