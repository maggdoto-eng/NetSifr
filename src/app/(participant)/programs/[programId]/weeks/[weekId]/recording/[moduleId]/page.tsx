import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { resolveUnlockSeconds } from '@/modules/learning';
import { RecordingPlayer } from './recording-player';

export default async function RecordingPage({
  params,
}: PageProps<'/programs/[programId]/weeks/[weekId]/recording/[moduleId]'>) {
  const { programId, weekId, moduleId } = await params;
  const { userId } = await verifySession();

  const module_ = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { recording: true },
  });
  if (!module_ || !module_.recording) notFound();

  const [record, unlockSeconds] = await Promise.all([
    prisma.attendanceRecord.findUnique({
      where: { userId_recordingModuleId: { userId, recordingModuleId: moduleId } },
    }),
    resolveUnlockSeconds(userId, moduleId),
  ]);

  return (
    <div className="flex flex-col gap-4 p-5">
      <div>
        <Link
          href={`/programs/${programId}/weeks/${weekId}`}
          className="text-xs text-zinc-500 underline"
        >
          ← Week
        </Link>
        <div className="mt-2 font-mono text-[10px] tracking-wide text-orange-600">RECORDING</div>
        <h1 className="mt-1 text-xl font-bold">{module_.title}</h1>
      </div>

      <RecordingPlayer
        recordingModuleId={moduleId}
        programId={programId}
        weekId={weekId}
        driveFileId={module_.recording.driveFileId}
        initialEngagedSeconds={record?.engagedSeconds ?? 0}
        unlockSeconds={unlockSeconds}
        initialConfirmed={!!record?.attendanceConfirmedAt}
      />
    </div>
  );
}
