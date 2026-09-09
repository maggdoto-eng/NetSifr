import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getAssignmentForTaking, getModuleNeighbors } from '@/modules/learning';
import { AssignmentExperience } from './assignment-experience';
import { ModuleNav } from '../../module-nav';

export default async function AssignmentPage({
  params,
}: PageProps<'/programs/[programId]/weeks/[weekId]/assignment/[moduleId]'>) {
  const { programId, weekId, moduleId } = await params;
  const { userId } = await verifySession();

  const [assignment, neighbors] = await Promise.all([
    getAssignmentForTaking(userId, moduleId),
    getModuleNeighbors(programId, moduleId),
  ]);

  return (
    <div className="stack">
      <div>
        <Link href={`/programs/${programId}/weeks/${weekId}`} className="mono" style={{ color: 'var(--mute)' }}>
          ← Week
        </Link>
        <div className="mono mono--coral" style={{ marginTop: 6 }}>
          Assignment
        </div>
      </div>

      <div className="card">
        <p style={{ margin: 0 }}>{assignment.prompt}</p>
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          Due {assignment.softDeadline.toLocaleDateString()} — late work is still accepted and
          flagged for your facilitator.
        </p>
      </div>

      {/* Forces a full remount when navigating between different assignment modules. */}
      <AssignmentExperience
        key={assignment.assignmentModuleId}
        programId={programId}
        weekId={weekId}
        assignment={assignment}
      />
      <ModuleNav programId={programId} prev={neighbors.prev} next={neighbors.next} />
    </div>
  );
}
