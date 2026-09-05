import Link from 'next/link';
import { requireAdminContext } from '@/app/admin/action-context';
import { getVolunteerOpportunityDetail, getShiftsForOpportunity } from '@/modules/volunteering';
import { NewShiftForm } from './new-shift-form';
import { openOpportunityAction, closeOpportunityAction, archiveOpportunityAction } from './actions';

const LOCATION_LABEL: Record<string, string> = {
  ONLINE: 'Online',
  PHYSICAL: 'In person',
  HYBRID: 'Hybrid',
};

export default async function OpportunityDetailPage({
  params,
}: PageProps<'/admin/volunteering/[opportunityId]'>) {
  const { opportunityId } = await params;
  const { organizationId } = await requireAdminContext();
  const [opportunity, shifts] = await Promise.all([
    getVolunteerOpportunityDetail(opportunityId, organizationId),
    getShiftsForOpportunity(opportunityId),
  ]);

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <Link href="/admin/volunteering" className="text-xs text-zinc-500 underline">
          ← Volunteering
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{opportunity.title}</h1>
          <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-600">
            {opportunity.status}
          </span>
        </div>
        {opportunity.description && (
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">{opportunity.description}</p>
        )}
        <div className="mt-1 font-mono text-[10px] tracking-wide text-zinc-500">
          {LOCATION_LABEL[opportunity.locationMode].toUpperCase()}
          {opportunity.applyByDate && ` · APPLY BY ${opportunity.applyByDate.toLocaleDateString()}`}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {opportunity.status !== 'OPEN' && opportunity.status !== 'ARCHIVED' && (
          <form action={openOpportunityAction.bind(null, opportunityId)}>
            <button className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
              Open for applications
            </button>
          </form>
        )}
        {opportunity.status === 'OPEN' && (
          <form action={closeOpportunityAction.bind(null, opportunityId)}>
            <button className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white">
              Close applications
            </button>
          </form>
        )}
        {opportunity.status !== 'ARCHIVED' && (
          <form action={archiveOpportunityAction.bind(null, opportunityId)}>
            <button className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium">
              Archive
            </button>
          </form>
        )}
        <Link
          href={`/admin/volunteering/${opportunityId}/applications`}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium"
        >
          Review applications
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Shifts</h2>
        <NewShiftForm opportunityId={opportunityId} />
        {shifts.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 text-sm"
          >
            <div>
              <div className="font-medium">{s.title}</div>
              <div className="font-mono text-[10px] tracking-wide text-zinc-500">
                {s.startsAt.toLocaleString()} → {s.endsAt.toLocaleTimeString()}
              </div>
            </div>
            <div className="font-mono text-xs text-zinc-600">
              {s.signups.length}
              {s.capacity != null ? ` / ${s.capacity}` : ''} signed up
            </div>
          </div>
        ))}
        {shifts.length === 0 && (
          <p className="text-sm text-zinc-500">
            No shifts yet — accepted volunteers can still log ad-hoc hours without one.
          </p>
        )}
      </div>
    </div>
  );
}
