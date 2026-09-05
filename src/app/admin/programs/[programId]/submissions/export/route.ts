import { requireAdminContext } from '@/app/admin/action-context';
import { getSubmissionsForCohort } from '@/modules/learning';
import { toCsv } from '@/lib/csv';

export async function GET(
  _req: Request,
  { params }: RouteContext<'/admin/programs/[programId]/submissions/export'>,
) {
  const { organizationId } = await requireAdminContext();
  const { programId } = await params;

  const submissions = await getSubmissionsForCohort(programId, organizationId);

  const headers = [
    'Name',
    'Email',
    'Assignment',
    'Attempt',
    'Late',
    'Submitted at',
    'Grade',
    'Feedback',
  ];
  const rows = submissions.map((s) => [
    s.user.name,
    s.user.credentials[0]?.identifier ?? '',
    s.assignmentModule.module.title,
    String(s.attemptNumber),
    s.isLate ? 'YES' : 'NO',
    s.submittedAt.toISOString(),
    s.grade?.label ?? 'UNGRADED',
    s.grade?.feedback ?? '',
  ]);

  return new Response(toCsv(headers, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="submissions.csv"',
    },
  });
}
