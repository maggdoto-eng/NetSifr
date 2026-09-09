import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getDefaultOrganization } from '@/lib/org';
import { AdminTopbar } from '../../../admin-topbar';
import { SettingsForm } from './settings-form';
import { setStatusAction, completeCohortAction } from './actions';

const STATUS_PILL: Record<string, string> = {
  DRAFT: 'pill pill--draft',
  LIVE: 'pill pill--live',
  ARCHIVED: 'pill pill--archived',
};

export default async function SettingsPage({
  params,
}: PageProps<'/admin/programs/[programId]/settings'>) {
  const { programId } = await params;
  const org = await getDefaultOrganization();

  const cohort = await prisma.cohort.findFirst({
    where: { id: programId, organizationId: org.id },
    include: {
      opportunity: { select: { title: true, summary: true } },
      courseVersion: { select: { _count: { select: { weeks: true } } } },
    },
  });
  if (!cohort) notFound();

  const currentWeek = await prisma.cohortSession.count({
    where: { cohortId: cohort.id, startsOn: { lte: new Date() } },
  });
  const weekCount = cohort.courseVersion._count.weeks;

  const datesLabel = cohort.startsAt
    ? new Date(cohort.startsAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Dates TBC';

  return (
    <>
      <AdminTopbar
        trail={[
          { label: 'Programs', href: '/admin/programs' },
          {
            label: `${cohort.cohortLabel} — ${cohort.opportunity.title}`,
            pill: <span className={STATUS_PILL[cohort.status]}>{cohort.status}</span>,
          },
        ]}
      />
      <div className="a-main">
        <h1 className="display-lg" style={{ marginBottom: 'var(--s5)' }}>
          Program settings
        </h1>
        <div className="split">
          <SettingsForm
            cohortId={cohort.id}
            defaults={{
              title: cohort.opportunity.title,
              cohortLabel: cohort.cohortLabel,
              summary: cohort.opportunity.summary ?? '',
              attendanceUnlockMinutes: cohort.attendanceUnlockMinutes,
            }}
            currentWeek={currentWeek}
            weekCount={weekCount}
            datesLabel={datesLabel}
          />

          <div className="stack">
            <div className="card stack">
              <div className="mono">Status</div>
              <div>
                <span className={STATUS_PILL[cohort.status]}>{cohort.status}</span>
              </div>
              {cohort.status === 'DRAFT' && (
                <form action={setStatusAction.bind(null, cohort.id, 'LIVE')}>
                  <button type="submit" className="btn btn--primary btn--block">
                    Publish program
                  </button>
                </form>
              )}
              {cohort.status === 'LIVE' && (
                <form action={setStatusAction.bind(null, cohort.id, 'ARCHIVED')}>
                  <button type="submit" className="btn btn--ghost btn--block">
                    Archive
                  </button>
                </form>
              )}
              {cohort.status === 'ARCHIVED' && (
                <form action={setStatusAction.bind(null, cohort.id, 'LIVE')}>
                  <button type="submit" className="btn btn--ghost btn--block">
                    Restore to live
                  </button>
                </form>
              )}
            </div>

            <div className="card stack">
              <div className="mono">Completion</div>
              <p className="muted" style={{ fontSize: 14, margin: 0 }}>
                Marks every active participant complete, unlocks their certificate, and notifies
                them.
              </p>
              <form action={completeCohortAction.bind(null, cohort.id)}>
                <button type="submit" className="btn btn--done btn--block">
                  Mark cohort complete
                </button>
              </form>
            </div>

            <div className="card card--notice">
              <div className="mono" style={{ marginBottom: 6 }}>
                Roles — not yet built
              </div>
              <p style={{ fontSize: 14, margin: 0 }}>
                Admin is currently org-wide. The intended model is per-program membership with{' '}
                <strong>owner / facilitator / participant</strong> roles, so a facilitator only sees
                their own programs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
