import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { resolveUnlockSeconds, getModuleNeighbors } from '@/modules/learning';
import { RecordingPlayer } from './recording-player';
import { ModuleNav } from '../../module-nav';

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

  const [record, unlockSeconds, neighbors] = await Promise.all([
    prisma.attendanceRecord.findUnique({
      where: { userId_recordingModuleId: { userId, recordingModuleId: moduleId } },
    }),
    resolveUnlockSeconds(userId, moduleId),
    getModuleNeighbors(programId, moduleId),
  ]);

  return (
    <div className="stack">
      <div>
        <Link href={`/programs/${programId}/weeks/${weekId}`} className="mono" style={{ color: 'var(--mute)' }}>
          ← Week
        </Link>
        <div className="mono mono--coral" style={{ marginTop: 6 }}>
          Recording
        </div>
        <h1 className="display-md" style={{ marginTop: 4 }}>
          {module_.title}
        </h1>
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
      <ModuleNav programId={programId} prev={neighbors.prev} next={neighbors.next} />
    </div>
  );
}
