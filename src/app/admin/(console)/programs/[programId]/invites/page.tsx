import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getInvitationsForCohort } from '@/modules/learning';
import { requireAdminContext } from '@/app/admin/action-context';
import { AdminTopbar } from '../../../admin-topbar';
import { InviteForm } from './invite-form';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Sent',
  ACCEPTED: 'Used',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

const STATUS_PILL: Record<string, string> = {
  PENDING: 'pill pill--due',
  ACCEPTED: 'pill pill--done',
  DECLINED: 'pill pill--archived',
  EXPIRED: 'pill pill--archived',
  REVOKED: 'pill pill--archived',
};

const STATUS_ORDER_PILL: Record<string, string> = {
  DRAFT: 'pill pill--draft',
  LIVE: 'pill pill--live',
  ARCHIVED: 'pill pill--archived',
};

export default async function InvitesPage({
  params,
}: PageProps<'/admin/programs/[programId]/invites'>) {
  const { programId } = await params;
  const { organizationId } = await requireAdminContext();

  const cohort = await prisma.cohort.findFirst({
    where: { id: programId, organizationId },
    include: { opportunity: { select: { title: true } } },
  });
  if (!cohort) notFound();

  const invites = await getInvitationsForCohort(programId, organizationId);

  return (
    <>
      <AdminTopbar
        trail={[
          { label: 'Programs', href: '/admin/programs' },
          {
            label: `${cohort.cohortLabel} — ${cohort.opportunity.title}`,
            pill: <span className={STATUS_ORDER_PILL[cohort.status]}>{cohort.status}</span>,
          },
        ]}
      />
      <div className="a-main">
        <div className="split">
          <InviteForm cohortId={programId} cohortLabel={cohort.cohortLabel} isDraft={cohort.status === 'DRAFT'} />

          <div className="stack">
            <div className="mono">Sent for this program · {invites.length}</div>
            {invites.length === 0 ? (
              <div className="empty">Nobody invited to this program yet.</div>
            ) : (
              invites.map((invite) => (
                <div key={invite.id} className="card card--pad-sm row">
                  <div className="grow">
                    <div className="truncate" style={{ fontWeight: 500 }}>
                      {invite.normalizedEmail}
                    </div>
                    <div className="mono" style={{ marginTop: 2 }}>
                      Sent {invite.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                  <span className={STATUS_PILL[invite.status]}>{STATUS_LABEL[invite.status]}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
