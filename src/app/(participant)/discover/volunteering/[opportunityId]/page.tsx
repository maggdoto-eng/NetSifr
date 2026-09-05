import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getVolunteerOpportunityDetail, getUserApplication } from '@/modules/volunteering';
import { ApplyButton } from './apply-button';

const LOCATION_LABEL: Record<string, string> = {
  ONLINE: 'Online',
  PHYSICAL: 'In person',
  HYBRID: 'Hybrid',
};

export default async function VolunteerDetailPage({
  params,
}: PageProps<'/discover/volunteering/[opportunityId]'>) {
  const { opportunityId } = await params;
  const { userId } = await verifySession();

  const [opportunity, application] = await Promise.all([
    getVolunteerOpportunityDetail(opportunityId),
    getUserApplication(userId, opportunityId),
  ]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 p-6">
      <Link href="/discover" className="text-xs text-zinc-500 underline">
        ← Discover
      </Link>

      <div>
        <div className="font-mono text-[10px] tracking-wide text-orange-600">VOLUNTEER</div>
        <h1 className="mt-1 text-xl font-bold">{opportunity.title}</h1>
        {opportunity.description && (
          <p className="mt-2 text-sm text-zinc-600">{opportunity.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">Where</span>
          <span className="font-medium">{LOCATION_LABEL[opportunity.locationMode]}</span>
        </div>
        {opportunity.applyByDate && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Apply by</span>
            <span className="font-medium">{opportunity.applyByDate.toLocaleDateString()}</span>
          </div>
        )}
        {opportunity.shifts.length > 0 && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Shifts</span>
            <span className="font-medium">{opportunity.shifts.length} available</span>
          </div>
        )}
      </div>

      {opportunity.skillRequirements.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {opportunity.skillRequirements.map((r) => (
            <span
              key={r.skill.id}
              className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
            >
              {r.skill.label}
            </span>
          ))}
        </div>
      )}

      {opportunity.status === 'OPEN' ? (
        <ApplyButton opportunityId={opportunityId} status={application?.status ?? null} />
      ) : (
        <p className="rounded-xl bg-zinc-100 p-3 text-center text-sm text-zinc-500">
          This opportunity isn&apos;t open for applications.
        </p>
      )}
    </div>
  );
}
