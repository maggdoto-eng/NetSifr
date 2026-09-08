import Link from 'next/link';
import { getSubmissionsForCohort } from '@/modules/learning';
import { requireAdminContext } from '@/app/admin/action-context';
import { gradeSubmissionAction } from './actions';

const GRADE_LABEL: Record<string, string> = {
  NEEDS_WORK: 'Needs work',
  GOOD: 'Good',
  EXCELLENT: 'Excellent',
};

export default async function SubmissionsPage({
  params,
}: PageProps<'/admin/programs/[programId]/submissions'>) {
  const { programId } = await params;
  const { organizationId } = await requireAdminContext();
  const submissions = await getSubmissionsForCohort(programId, organizationId);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Submissions</h2>
        <Link
          href={`/admin/programs/${programId}/submissions/export`}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Export CSV
        </Link>
      </div>

      {submissions.length === 0 && (
        <p className="rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          No submissions yet.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {submissions.map((submission) => (
          <div key={submission.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <span className="font-semibold">{submission.user.name}</span>
                <span className="ml-2 text-zinc-500">
                  {submission.user.credentials[0]?.identifier ?? '—'}
                </span>
              </div>
              <div className="font-mono text-[10px] text-zinc-500">
                {submission.assignmentModule.module.title} · ATTEMPT {submission.attemptNumber}
                {submission.isLate && ' · LATE'}
              </div>
            </div>

            <p className="mt-3 whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm text-zinc-700">
              {submission.bodyText}
            </p>

            <form
              action={gradeSubmissionAction.bind(null, {
                cohortId: programId,
                submissionId: submission.id,
              })}
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start"
            >
              <select
                name="label"
                defaultValue={submission.grade?.label ?? ''}
                required
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="" disabled>
                  Grade…
                </option>
                {Object.entries(GRADE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <textarea
                name="feedback"
                defaultValue={submission.grade?.feedback ?? ''}
                required
                rows={2}
                placeholder="Feedback…"
                className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="flex-none rounded bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white"
              >
                {submission.grade ? 'Update grade' : 'Submit grade'}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
