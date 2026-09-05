import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getRegistrationsForOccurrence } from '@/modules/events';
import { requireAdminContext } from '@/app/admin/action-context';
import { adminCheckInAction } from './actions';

const STATUS_STYLES: Record<string, string> = {
  REGISTERED: 'bg-emerald-100 text-emerald-800',
  WAITLISTED: 'bg-amber-100 text-amber-800',
};

export default async function RegistrationsPage({
  params,
}: PageProps<'/admin/events/[eventId]/occurrences/[occurrenceId]/registrations'>) {
  const { eventId, occurrenceId } = await params;
  const { organizationId } = await requireAdminContext();

  const [registrations, checkIns] = await Promise.all([
    getRegistrationsForOccurrence(occurrenceId, organizationId),
    prisma.eventCheckIn.findMany({ where: { eventOccurrenceId: occurrenceId } }),
  ]);
  const checkedInUserIds = new Set(checkIns.map((c) => c.userId));

  return (
    <div className="flex flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Registrations</h2>
        <Link
          href={`/admin/events/${eventId}/occurrences/${occurrenceId}/registrations/export`}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Export CSV
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50 text-left">
              <th className="border-b border-zinc-200 px-4 py-2 font-mono text-[10px] text-zinc-500">
                NAME
              </th>
              <th className="border-b border-zinc-200 px-4 py-2 font-mono text-[10px] text-zinc-500">
                EMAIL
              </th>
              <th className="border-b border-zinc-200 px-4 py-2 font-mono text-[10px] text-zinc-500">
                STATUS
              </th>
              <th className="border-b border-zinc-200 px-4 py-2 font-mono text-[10px] text-zinc-500">
                CHECK-IN
              </th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 font-medium">{r.user.name}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {r.user.credentials[0]?.identifier ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[10px] ${STATUS_STYLES[r.status]}`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {checkedInUserIds.has(r.userId) ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] text-emerald-800">
                      ✓ Checked in
                    </span>
                  ) : (
                    <form
                      action={adminCheckInAction.bind(null, {
                        eventId,
                        occurrenceId,
                        userId: r.userId,
                      })}
                    >
                      <button
                        type="submit"
                        className="rounded bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-300"
                      >
                        Check in
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {registrations.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  Nobody registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
