import Link from 'next/link';
import { getOccurrenceDetail } from '@/modules/events';
import { requireAdminContext } from '@/app/admin/action-context';

const TABS = [
  { segment: 'registrations', label: 'Registrations' },
  { segment: 'check-in', label: 'Check-in QR' },
  { segment: 'feedback', label: 'Feedback' },
];

export default async function OccurrenceLayout({
  children,
  params,
}: LayoutProps<'/admin/events/[eventId]/occurrences/[occurrenceId]'>) {
  const { eventId, occurrenceId } = await params;
  const { organizationId } = await requireAdminContext();
  const occurrence = await getOccurrenceDetail(occurrenceId, organizationId);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex h-14 flex-none items-center gap-4 border-b border-zinc-200 px-6">
        <Link href={`/admin/events/${eventId}`} className="text-sm text-zinc-500 underline">
          ← {occurrence.event.title}
        </Link>
        <div className="min-w-0 truncate text-sm font-semibold">
          {occurrence.startsAt.toLocaleDateString()}
        </div>
        <nav className="ml-2 flex gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.segment}
              href={`/admin/events/${eventId}/occurrences/${occurrenceId}/${tab.segment}`}
              className="rounded px-3 py-1.5 text-sm hover:bg-zinc-100"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
