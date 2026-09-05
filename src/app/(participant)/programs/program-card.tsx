import Link from 'next/link';

// Per-program identity colour, assigned round-robin (mint → coral → pine → sand),
// exactly as the prototype's program "mark". Never a fifth colour.
export const MARK_COLORS = ['#86E5BC', '#FF6A45', '#123B2E', '#E3D9C2'];

export function ProgramCard(props: {
  cohortId: string;
  title: string;
  cohortLabel: string;
  progressPercent: number;
  weekCount: number;
  markColor: string;
  completed?: boolean;
}) {
  if (props.completed) {
    return (
      <Link
        href={`/programs/${props.cohortId}`}
        className="flex items-center gap-3 rounded-[18px] border border-[rgba(16,36,30,0.1)] bg-[rgba(16,36,30,0.05)] p-4"
      >
        <div className="ns-mark" style={{ background: props.markColor }} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{props.title}</div>
          <div className="ns-label mt-1 text-[9.5px] tracking-[0.1em] text-[#4A6258]">
            {props.cohortLabel}
          </div>
        </div>
        <span className="ns-label rounded-full bg-[#10241E] px-2.5 py-1 text-[9.5px] text-cream">
          Done
        </span>
      </Link>
    );
  }

  return (
    <Link href={`/programs/${props.cohortId}`} className="ns-card flex flex-col gap-3.5 p-[18px]">
      <div className="flex items-start gap-3">
        <div className="ns-mark" style={{ background: props.markColor }} />
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-extrabold leading-tight tracking-[-0.02em]">
            {props.title}
          </div>
          <div className="ns-label mt-1.5 text-[9.5px] tracking-[0.1em] text-[#4A6258]">
            {props.cohortLabel} · {props.weekCount} weeks
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-[rgba(16,36,30,0.1)]">
          <div
            className="h-full rounded-full"
            style={{ width: `${props.progressPercent}%`, background: props.markColor }}
          />
        </div>
        <div className="font-mono text-[11px] font-semibold text-[#10241E]">
          {props.progressPercent}%
        </div>
      </div>
    </Link>
  );
}
