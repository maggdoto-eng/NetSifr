import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getAssignmentForTaking } from '@/modules/learning';
import { AssignmentExperience } from './assignment-experience';

export default async function AssignmentPage({
  params,
}: PageProps<'/programs/[programId]/weeks/[weekId]/assignment/[moduleId]'>) {
  const { programId, weekId, moduleId } = await params;
  const { userId } = await verifySession();

  const assignment = await getAssignmentForTaking(userId, moduleId);

  return (
    <div className="flex flex-col gap-4 p-5">
      <div>
        <Link
          href={`/programs/${programId}/weeks/${weekId}`}
          className="text-xs text-zinc-500 underline"
        >
          ← Week
        </Link>
        <div className="mt-2 font-mono text-[10px] tracking-wide text-orange-600">ASSIGNMENT</div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <p className="text-sm">{assignment.prompt}</p>
        <p className="mt-2 text-xs text-zinc-500">
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
    </div>
  );
}
