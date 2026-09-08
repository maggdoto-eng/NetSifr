import Link from 'next/link';
import { getDefaultOrganization } from '@/lib/org';
import { requireAdminContext } from '@/app/admin/action-context';
import { getVolunteerOpportunitiesForOrg } from '@/modules/volunteering';
import { NewOpportunityForm } from './new-opportunity-form';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  OPEN: 'bg-emerald-200 text-emerald-900',
  CLOSED: 'bg-amber-200 text-amber-900',
  ARCHIVED: 'bg-zinc-800 text-zinc-100',
};

export default async function VolunteeringPage() {
  await requireAdminContext();
  const org = await getDefaultOrganization();
  const opportunities = await getVolunteerOpportunitiesForOrg(org.id);

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Volunteering</h1>
        <Link
          href="/admin/volunteering/service-logs"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium"
        >
          Verify hours
        </Link>
      </div>

      <NewOpportunityForm />

      <div className="flex flex-col gap-3">
        {opportunities.map((o) => (
          <Link
            key={o.id}
            href={`/admin/volunteering/${o.id}`}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400"
          >
            <div>
              <div className="font-semibold">{o.title}</div>
              <div className="mt-1 font-mono text-[10px] tracking-wide text-zinc-500">
                {o._count.applications} APPLICATIONS · {o._count.shifts} SHIFTS
              </div>
            </div>
            <span
              className={`rounded px-2 py-0.5 font-mono text-[10px] ${STATUS_STYLES[o.status]}`}
            >
              {o.status}
            </span>
          </Link>
        ))}
        {opportunities.length === 0 && (
          <p className="rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No volunteer opportunities yet — create one above.
          </p>
        )}
      </div>
    </div>
  );
}
