import { getInvitationsForCohort } from '@/modules/learning';
import { requireAdminContext } from '@/app/admin/action-context';
import { InviteForm } from './invite-form';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'SENT',
  ACCEPTED: 'USED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-zinc-200 text-zinc-700',
  ACCEPTED: 'bg-emerald-200 text-emerald-900',
  DECLINED: 'bg-zinc-200 text-zinc-500',
  EXPIRED: 'bg-zinc-200 text-zinc-500',
  REVOKED: 'bg-zinc-200 text-zinc-500',
};

export default async function InvitesPage({
  params,
}: PageProps<'/admin/programs/[programId]/invites'>) {
  const { programId } = await params;
  const { organizationId } = await requireAdminContext();
  const invites = await getInvitationsForCohort(programId, organizationId);

  return (
    <div className="flex h-full min-h-0 gap-8 overflow-y-auto p-8">
      <InviteForm cohortId={programId} />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="font-mono text-[10px] tracking-wide text-zinc-500">
          SENT FOR THIS PROGRAM · {invites.length}
        </div>
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center gap-3 rounded-lg bg-zinc-50 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{invite.normalizedEmail}</div>
              <div className="font-mono text-[10px] text-zinc-500">
                SENT {invite.createdAt.toLocaleDateString()}
              </div>
            </div>
            <span
              className={`rounded px-2 py-0.5 font-mono text-[10px] tracking-wide ${STATUS_STYLE[invite.status]}`}
            >
              {STATUS_LABEL[invite.status]}
            </span>
          </div>
        ))}
        {invites.length === 0 && (
          <p className="rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            Nobody invited to this program yet.
          </p>
        )}
      </div>
    </div>
  );
}
