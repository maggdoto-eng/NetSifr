import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getMyVolunteering } from '@/modules/volunteering';
import { BottomNav } from '../bottom-nav';

const STATUS_STYLE: Record<string, string> = {
  APPLIED: 'bg-sky-100 text-sky-800',
  SHORTLISTED: 'bg-sky-100 text-sky-800',
  ACCEPTED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-zinc-100 text-zinc-500',
};

const STATUS_LABEL: Record<string, string> = {
  APPLIED: 'Applied',
  SHORTLISTED: 'Shortlisted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Not selected',
  WITHDRAWN: 'Withdrawn',
};

export default async function MyVolunteeringPage() {
  const { userId } = await verifySession();
  const items = await getMyVolunteering(userId);

  return (
    <>
      <header className="ns-hero px-[22px] pb-6 pt-7">
        <div className="ns-label text-mint">Act</div>
        <h1 className="mt-1.5 text-[28px] leading-none text-cream">My volunteering</h1>
        <p className="mt-2 text-[13px] text-[rgba(245,242,234,0.72)]">
          Opportunities you&apos;ve applied to.
        </p>
      </header>
      <div className="flex flex-col gap-6 p-[22px]">
        <div className="flex flex-col gap-3">
          {items.map((v) => (
            <Link
              key={v.applicationId}
              href={
                v.status === 'ACCEPTED'
                  ? `/volunteering/${v.volunteerOpportunityId}`
                  : `/discover/volunteering/${v.volunteerOpportunityId}`
              }
              className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <div>
                <div className="font-bold leading-tight">{v.title}</div>
                <div className="font-mono text-[10px] tracking-wide text-zinc-500">
                  APPLIED {v.appliedAt.toLocaleDateString()}
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[v.status]}`}
              >
                {STATUS_LABEL[v.status]}
              </span>
            </Link>
          ))}
          {items.length === 0 && (
            <p className="rounded-xl border-2 border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500">
              Nothing yet — browse{' '}
              <Link href="/discover" className="underline">
                Discover
              </Link>{' '}
              to find a volunteer call.
            </p>
          )}
        </div>
      </div>
      <BottomNav active="/volunteering" />
    </>
  );
}
