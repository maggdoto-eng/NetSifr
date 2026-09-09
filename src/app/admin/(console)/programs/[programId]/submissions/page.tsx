import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSubmissionsForCohort } from '@/modules/learning';
import { requireAdminContext } from '@/app/admin/action-context';
import { AdminTopbar } from '../../../admin-topbar';
import { SubmissionsWorkspace, type SubmissionView } from './submissions-workspace';

const STATUS_ORDER_PILL: Record<string, string> = {
  DRAFT: 'pill pill--draft',
  LIVE: 'pill pill--live',
  ARCHIVED: 'pill pill--archived',
};

export default async function SubmissionsPage({
  params,
}: PageProps<'/admin/programs/[programId]/submissions'>) {
  const { programId } = await params;
  const { organizationId } = await requireAdminContext();

  const cohort = await prisma.cohort.findFirst({
    where: { id: programId, organizationId },
    include: { opportunity: { select: { title: true } } },
  });
  if (!cohort) notFound();

  const submissions = await getSubmissionsForCohort(programId, organizationId);
  const views: SubmissionView[] = submissions.map((s) => ({
    id: s.id,
    studentName: s.user.name,
    studentEmail: s.user.credentials[0]?.identifier ?? '—',
    moduleTitle: s.assignmentModule.module.title,
    attemptNumber: s.attemptNumber,
    isLate: s.isLate,
    bodyText: s.bodyText,
    grade: s.grade ? { label: s.grade.label, feedback: s.grade.feedback } : null,
  }));

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
        actions={
          <Link
            href={`/admin/programs/${programId}/submissions/export`}
            className="btn btn--ghost btn--sm"
          >
            Export CSV
          </Link>
        }
      />
      <SubmissionsWorkspace cohortId={programId} submissions={views} />
    </>
  );
}
