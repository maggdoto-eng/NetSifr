import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getOccurrenceDetail, getUserRegistration } from '@/modules/events';
import { RegisterButton } from './register-button';

const LOCATION_LABEL: Record<string, string> = {
  ONLINE: 'Online',
  PHYSICAL: 'In person',
  HYBRID: 'Hybrid',
};

export default async function EventDetailPage({
  params,
}: PageProps<'/discover/events/[occurrenceId]'>) {
  const { occurrenceId } = await params;
  const { userId } = await verifySession();

  const [occurrence, registration] = await Promise.all([
    getOccurrenceDetail(occurrenceId),
    getUserRegistration(userId, occurrenceId),
  ]);
  const activeStatus =
    registration && registration.status !== 'CANCELLED' ? registration.status : null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 p-6">
      <Link href="/discover" className="text-xs text-zinc-500 underline">
        ← Discover
      </Link>

      <div>
        <div className="font-mono text-[10px] tracking-wide text-orange-600">EVENT</div>
        <h1 className="mt-1 text-xl font-bold">{occurrence.event.title}</h1>
        {occurrence.event.description && (
          <p className="mt-2 text-sm text-zinc-600">{occurrence.event.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">When</span>
          <span className="font-medium">{occurrence.startsAt.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Where</span>
          <span className="font-medium">{LOCATION_LABEL[occurrence.locationMode]}</span>
        </div>
        {occurrence.capacity != null && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Capacity</span>
            <span className="font-medium">{occurrence.capacity}</span>
          </div>
        )}
      </div>

      {occurrence.status === 'LIVE' ? (
        <RegisterButton occurrenceId={occurrenceId} status={activeStatus} />
      ) : (
        <p className="rounded-xl bg-zinc-100 p-3 text-center text-sm text-zinc-500">
          This event isn&apos;t open for registration.
        </p>
      )}
    </div>
  );
}
