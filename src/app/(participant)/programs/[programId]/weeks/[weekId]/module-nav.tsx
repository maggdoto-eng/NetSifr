import Link from 'next/link';

type Neighbor = { weekId: string; moduleId: string; route: string; title: string } | null;

/**
 * Linear course navigation at the foot of every module page — move to the
 * previous / next released module without bouncing back to the week list.
 */
export function ModuleNav({
  programId,
  prev,
  next,
}: {
  programId: string;
  prev: Neighbor;
  next: Neighbor;
}) {
  const href = (n: NonNullable<Neighbor>) =>
    `/programs/${programId}/weeks/${n.weekId}/${n.route}/${n.moduleId}`;

  return (
    <div className="row row--between" style={{ gap: 'var(--s3)', marginTop: 'var(--s4)' }}>
      {prev ? (
        <Link href={href(prev)} className="btn btn--ghost grow" style={{ justifyContent: 'flex-start', minWidth: 0 }}>
          <span className="truncate">← {prev.title}</span>
        </Link>
      ) : (
        <span className="grow" />
      )}
      {next ? (
        <Link href={href(next)} className="btn btn--primary grow" style={{ justifyContent: 'flex-end', minWidth: 0 }}>
          <span className="truncate">{next.title} →</span>
        </Link>
      ) : (
        <span className="grow" />
      )}
    </div>
  );
}
