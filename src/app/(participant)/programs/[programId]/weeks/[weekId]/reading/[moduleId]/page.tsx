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
    <div className="flex flex-col gap-4 p-5">
      <div>
        <Link
          href={`/programs/${programId}/weeks/${weekId}`}
          className="text-xs text-zinc-500 underline"
        >
          ← Week
        </Link>
        <div className="mt-2 font-mono text-[10px] tracking-wide text-orange-600">READING</div>
        <h1 className="mt-1 text-xl font-bold">{module_.title}</h1>
      </div>

      <div className="flex h-48 items-center justify-center rounded-2xl bg-zinc-100 font-mono text-xs text-zinc-500">
        {module_.reading.contentUrl ? (
          <a
            href={module_.reading.contentUrl}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Open reading
          </a>
        ) : (
          'PDF PREVIEW'
        )}
      </div>

      <p className="text-sm text-zinc-600">Read before the quiz — the questions come from this.</p>

      <form action={markReadingDoneAction.bind(null, { moduleId, programId, weekId })}>
        <button
          type="submit"
          className={`w-full rounded-xl py-3 font-semibold ${
            progress ? 'bg-zinc-200 text-zinc-600' : 'bg-zinc-900 text-white'
          }`}
        >
          {progress ? 'Marked as read' : 'Mark as read'}
        </button>
      </form>
    </div>
  );
}
