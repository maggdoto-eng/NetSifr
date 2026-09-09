import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdminContext } from '@/app/admin/action-context';
import { getAnnouncementsForCohort } from '@/modules/communications';
import { AdminTopbar } from '../../../admin-topbar';
import { AnnounceForm } from './announce-form';

const STATUS_PILL: Record<string, string> = {
  DRAFT: 'pill pill--draft',
  LIVE: 'pill pill--live',
  ARCHIVED: 'pill pill--archived',
};

export default async function AnnouncementsPage({
  params,
}: PageProps<'/admin/programs/[programId]/announcements'>) {
  const { programId } = await params;
  const { organizationId } = await requireAdminContext();

  const cohort = await prisma.cohort.findFirst({
    where: { id: programId, organizationId },
    include: { opportunity: { select: { title: true } } },
  });
  if (!cohort) notFound();

  const announcements = await getAnnouncementsForCohort(programId);

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
        <div className="split">
          <div className="stack">
            <div>
              <h1 className="display-lg">Announcements</h1>
              <p className="lede" style={{ marginTop: 8 }}>
                Posts go to everyone enrolled in this cohort — they appear on the participant home
                and send an in-app notification.
              </p>
            </div>

            {announcements.length === 0 ? (
              <div className="empty">No announcements yet.</div>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="card stack" style={{ gap: 'var(--s2)' }}>
                  <div className="row row--between">
                    <div className="title">{a.title}</div>
                    <span className="mono">{a.createdAt.toLocaleDateString()}</span>
                  </div>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{a.body}</p>
                  <div className="mono">By {a.author.name}</div>
                </div>
              ))
            )}
          </div>

          <AnnounceForm cohortId={programId} />
        </div>
      </div>
    </>
  );
}
