import Link from 'next/link';
import { requireAdminContext } from '@/app/admin/action-context';
import { getApplicationsForOpportunity } from '@/modules/volunteering';
import { decideApplicationAction } from './actions';

const STATUS_STYLES: Record<string, string> = {
  APPLIED: 'bg-zinc-200 text-zinc-700',
  SHORTLISTED: 'bg-sky-200 text-sky-900',
  ACCEPTED: 'bg-emerald-200 text-emerald-900',
  REJECTED: 'bg-red-200 text-red-900',
  WITHDRAWN: 'bg-zinc-200 text-zinc-500',
};

export default async function ApplicationsPage({
  params,
}: PageProps<'/admin/volunteering/[opportunityId]/applications'>) {
  const { opportunityId } = await params;
  const { organizationId } = await requireAdminContext();
  const applications = await getApplicationsForOpportunity(opportunityId, organizationId);

  return (
    <div className="flex flex-col gap-4 p-8">
      <div>
        <Link
          href={`/admin/volunteering/${opportunityId}`}
          className="text-xs text-zinc-500 underline"
        >
          ← Opportunity
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Applications</h1>
      </div>

      <div className="flex flex-col gap-3">
        {applications.map((a) => {
          const decided = a.status === 'ACCEPTED' || a.status === 'REJECTED';
          return (
            <div key={a.id} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{a.user.name}</div>
                  <div className="font-mono text-[10px] text-zinc-500">
                    {a.user.credentials[0]?.identifier ?? '—'} · APPLIED{' '}
                    {a.appliedAt.toLocaleDateString()}
                  </div>
                </div>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-[10px] ${STATUS_STYLES[a.status]}`}
                >
                  {a.status}
                </span>
              </div>
              {a.message && <p className="mt-2 text-sm text-zinc-700">{a.message}</p>}
              {!decided && a.status !== 'WITHDRAWN' && (
                <div className="mt-3 flex gap-2">
                  {a.status === 'APPLIED' && (
                    <form
                      action={decideApplicationAction.bind(null, {
                        opportunityId,
                        applicationId: a.id,
                        status: 'SHORTLISTED',
                      })}
                    >
                      <button className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium">
                        Shortlist
                      </button>
                    </form>
                  )}
                  <form
                    action={decideApplicationAction.bind(null, {
                      opportunityId,
                      applicationId: a.id,
                      status: 'ACCEPTED',
                    })}
                  >
                    <button className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                      Accept
                    </button>
                  </form>
                  <form
                    action={decideApplicationAction.bind(null, {
                      opportunityId,
                      applicationId: a.id,
                      status: 'REJECTED',
                    })}
                  >
                    <button className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700">
                      Reject
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
        {applications.length === 0 && (
          <p className="rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No applications yet.
          </p>
        )}
      </div>
    </div>
  );
}
