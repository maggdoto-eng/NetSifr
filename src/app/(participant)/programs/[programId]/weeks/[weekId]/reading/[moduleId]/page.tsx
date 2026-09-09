import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { markReadingDoneAction } from './actions';

export default async function ReadingPage({
  params,
}: PageProps<'/programs/[programId]/weeks/[weekId]/reading/[moduleId]'>) {
  const { programId, weekId, moduleId } = await params;
  const { userId } = await verifySession();

  const module_ = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { reading: true },
  });
  if (!module_ || !module_.reading) notFound();

  const progress = await prisma.readingProgress.findUnique({
    where: { userId_readingModuleId: { userId, readingModuleId: moduleId } },
  });

  return (
    <div className="stack">
      <div>
        <Link href={`/programs/${programId}/weeks/${weekId}`} className="mono" style={{ color: 'var(--mute)' }}>
          ← Week
        </Link>
        <div className="mono mono--coral" style={{ marginTop: 6 }}>
          Reading
        </div>
        <h1 className="display-md" style={{ marginTop: 4 }}>
          {module_.title}
        </h1>
      </div>

      <div className="placeholder placeholder--doc" style={{ height: 200 }}>
        {module_.reading.contentUrl ? (
          <a href={module_.reading.contentUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
            Open reading
          </a>
        ) : (
          <span className="mono">PDF preview</span>
        )}
      </div>

      <p className="muted" style={{ fontSize: 14 }}>
        Read before the quiz — the questions come from this.
      </p>

      <form action={markReadingDoneAction.bind(null, { moduleId, programId, weekId })}>
        <button type="submit" className={`btn btn--block ${progress ? 'btn--done' : 'btn--primary'}`}>
          {progress ? 'Marked as read ✓' : 'Mark as read'}
        </button>
      </form>
    </div>
  );
}
