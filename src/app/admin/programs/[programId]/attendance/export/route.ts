import { requireAdminContext } from '@/app/admin/action-context';
import { getCohortRoster } from '@/modules/learning';
import { toCsv } from '@/lib/csv';

export async function GET(
  _req: Request,
  { params }: RouteContext<'/admin/programs/[programId]/attendance/export'>,
) {
  const { organizationId } = await requireAdminContext();
  const { programId } = await params;

  const { recordings, rows } = await getCohortRoster(programId, organizationId);

  const headers = ['Name', 'Email', 'Status', 'Attendance %', ...recordings.map((r) => r.title)];
  const csvRows = rows.map((row) => [
    row.name,
    row.email,
    row.status,
    String(row.attendancePercent),
    ...row.recordings.map((r) => (r.confirmedAt ? `CONFIRMED (${r.method})` : 'NOT YET')),
  ]);

  return new Response(toCsv(headers, csvRows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="attendance.csv"',
    },
  });
}
