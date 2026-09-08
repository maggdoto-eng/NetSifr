import Link from 'next/link';
import { getCohortRoster } from '@/modules/learning';
import { requireAdminContext } from '@/app/admin/action-context';
import { overrideAttendanceAction } from './actions';

const METHOD_LABEL: Record<string, string> = {
  ENGAGEMENT_PROXY: 'Proxy',
  ADMIN_OVERRIDE: 'Override',
  LIVE_ATTENDANCE: 'Live',
};

export default async function AttendancePage({
  params,
}: PageProps<'/admin/programs/[programId]/attendance'>) {
  const { programId } = await params;
  const { organizationId } = await requireAdminContext();
  const { recordings, rows } = await getCohortRoster(programId, organizationId);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Attendance</h2>
        <Link
          href={`/admin/programs/${programId}/attendance/export`}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Export CSV
        </Link>
      </div>

      {recordings.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          No recordings published yet.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-zinc-200">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="sticky top-0 bg-zinc-50 text-left">
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
                  ATTENDANCE %
                </th>
                {recordings.map((r) => (
                  <th
                    key={r.moduleId}
                    className="min-w-40 border-b border-zinc-200 px-4 py-2 font-mono text-[10px] text-zinc-500"
                  >
                    {r.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.enrolmentId} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{row.email}</td>
                  <td className="px-4 py-3 text-zinc-600">{row.status}</td>
                  <td className="px-4 py-3 text-zinc-600">{row.attendancePercent}%</td>
                  {row.recordings.map((r) => (
                    <td key={r.moduleId} className="px-4 py-3">
                      {r.confirmedAt ? (
                        <span
                          className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] text-emerald-800"
                          title={`${Math.round(r.engagedSeconds / 60)} min engaged`}
                        >
                          ✓ {METHOD_LABEL[r.method ?? ''] ?? r.method}
                        </span>
                      ) : (
                        <form
                          action={overrideAttendanceAction.bind(null, {
                            cohortId: programId,
                            userId: row.userId,
                            recordingModuleId: r.moduleId,
                          })}
                          className="flex items-center gap-1"
                        >
                          <input
                            name="note"
                            type="text"
                            placeholder="Note (optional)"
                            className="w-28 rounded border border-zinc-300 px-1.5 py-1 text-xs"
                          />
                          <button
                            type="submit"
                            className="flex-none rounded bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-300"
                          >
                            Override
                          </button>
                        </form>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={4 + recordings.length}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Nobody enrolled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
