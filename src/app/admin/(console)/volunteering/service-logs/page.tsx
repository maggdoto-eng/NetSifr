import Link from 'next/link';
import { requireAdminContext } from '@/app/admin/action-context';
import { getPendingServiceLogs } from '@/modules/volunteering';
import { verifyServiceAction } from './actions';

export default async function ServiceLogsPage() {
  const { organizationId } = await requireAdminContext();
  const logs = await getPendingServiceLogs(organizationId);

  return (
    <div className="flex flex-col gap-4 p-8">
      <div>
        <Link href="/admin/volunteering" className="text-xs text-zinc-500 underline">
          ← Volunteering
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Hours to verify</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pending service logs across all opportunities. Verifying awards points to the volunteer.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold">
                {log.hours}h · {log.user.name}
              </div>
              <div className="font-mono text-[10px] tracking-wide text-zinc-500">
                {log.user.credentials[0]?.identifier ?? '—'} · {log.volunteerOpportunity.title} ·{' '}
                {log.occurredOn.toLocaleDateString()}
              </div>
              {log.note && <p className="mt-1 text-sm text-zinc-700">{log.note}</p>}
            </div>
            <div className="flex gap-2">
              <form
                action={verifyServiceAction.bind(null, {
                  serviceLogId: log.id,
                  status: 'VERIFIED',
                })}
              >
                <button className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                  Verify
                </button>
              </form>
              <form
                action={verifyServiceAction.bind(null, {
                  serviceLogId: log.id,
                  status: 'REJECTED',
                })}
              >
                <button className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700">
                  Reject
                </button>
              </form>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <p className="rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No hours waiting to be verified.
          </p>
        )}
      </div>
    </div>
  );
}
