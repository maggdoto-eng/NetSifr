import { prisma } from '@/lib/prisma';
import { requireAdminContext } from '@/app/admin/action-context';
import { getRegistrationsForOccurrence } from '@/modules/events';
import { toCsv } from '@/lib/csv';

export async function GET(
  _req: Request,
  {
    params,
  }: RouteContext<'/admin/events/[eventId]/occurrences/[occurrenceId]/registrations/export'>,
) {
  const { organizationId } = await requireAdminContext();
  const { occurrenceId } = await params;

  const [registrations, checkIns] = await Promise.all([
    getRegistrationsForOccurrence(occurrenceId, organizationId),
    prisma.eventCheckIn.findMany({ where: { eventOccurrenceId: occurrenceId } }),
  ]);
  const checkedInUserIds = new Set(checkIns.map((c) => c.userId));

  const headers = ['Name', 'Email', 'Status', 'Checked in'];
  const rows = registrations.map((r) => [
    r.user.name,
    r.user.credentials[0]?.identifier ?? '',
    r.status,
    checkedInUserIds.has(r.userId) ? 'YES' : 'NO',
  ]);

  return new Response(toCsv(headers, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="registrations.csv"',
    },
  });
}
