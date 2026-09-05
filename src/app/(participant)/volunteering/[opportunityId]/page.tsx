import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import {
  getVolunteerOpportunityDetail,
  getShiftsForOpportunity,
  getUserApplication,
  getUserSignups,
  getUserServiceLogs,
} from '@/modules/volunteering';
import { ShiftSignup } from './shift-signup';
import { LogHoursForm } from './log-hours-form';

const LOG_STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  VERIFIED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-700',
};

export default async function VolunteeringWorkspacePage({
  params,
}: PageProps<'/volunteering/[opportunityId]'>) {
  const { opportunityId } = await params;
  const { userId } = await verifySession();

  const [opportunity, application] = await Promise.all([
    getVolunteerOpportunityDetail(opportunityId),
    getUserApplication(userId, opportunityId),
  ]);
  const accepted = application?.status === 'ACCEPTED';

  const [shifts, signups, logs] = accepted
    ? await Promise.all([
        getShiftsForOpportunity(opportunityId),
        getUserSignups(userId, opportunityId),
        getUserServiceLogs(userId, opportunityId),
      ])
    : [[], [], []];
  const signupByShift = new Map(signups.map((s) => [s.shiftId, s.id]));

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 p-6">
      <Link href="/volunteering" className="text-xs text-zinc-500 underline">
        ← My volunteering
      </Link>

      <div>
        <div className="font-mono text-[10px] tracking-wide text-orange-600">VOLUNTEER</div>
        <h1 className="mt-1 text-xl font-bold">{opportunity.title}</h1>
      </div>

      {!accepted ? (
        <div className="rounded-xl bg-zinc-100 p-4 text-center text-sm text-zinc-600">
          Your application is{' '}
          <span className="font-semibold">
            {application?.status.toLowerCase() ?? 'not submitted'}
          </span>
          . Shifts and hour logging unlock once you&apos;re accepted.
        </div>
      ) : (
        <>
          {shifts.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="text-sm font-semibold">Shifts</div>
              {shifts.map((s) => {
                const taken = s.signups.length;
                const full = s.capacity != null && taken >= s.capacity && !signupByShift.has(s.id);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4"
                  >
                    <div>
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="font-mono text-[10px] tracking-wide text-zinc-500">
                        {s.startsAt.toLocaleString()}
                        {s.capacity != null && ` · ${taken}/${s.capacity}`}
                      </div>
                    </div>
                    <ShiftSignup
                      opportunityId={opportunityId}
                      shiftId={s.id}
                      signupId={signupByShift.get(s.id) ?? null}
                      full={full}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <LogHoursForm
            opportunityId={opportunityId}
            shifts={shifts.map((s) => ({ id: s.id, title: s.title }))}
          />

          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold">Your hours</div>
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 text-sm"
              >
                <div>
                  <span className="font-medium">{log.hours}h</span>
                  <span className="ml-2 font-mono text-[10px] text-zinc-500">
                    {log.occurredOn.toLocaleDateString()}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${LOG_STATUS_STYLE[log.status]}`}
                >
                  {log.status}
                </span>
              </div>
            ))}
            {logs.length === 0 && <p className="text-sm text-zinc-500">No hours logged yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}
