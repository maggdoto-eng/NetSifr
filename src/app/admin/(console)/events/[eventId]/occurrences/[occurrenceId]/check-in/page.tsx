import QRCode from 'qrcode';
import { getOccurrenceDetail } from '@/modules/events';
import { requireAppUrl } from '@/lib/url';

export default async function CheckInQrPage({
  params,
}: PageProps<'/admin/events/[eventId]/occurrences/[occurrenceId]/check-in'>) {
  const { occurrenceId } = await params;
  const occurrence = await getOccurrenceDetail(occurrenceId);

  const checkInUrl = `${requireAppUrl()}/events/${occurrenceId}/check-in?token=${occurrence.checkInToken}`;
  const qrSvg = await QRCode.toString(checkInUrl, { type: 'svg', width: 280, margin: 1 });

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2 className="self-start text-xl font-bold">Check-in QR</h2>
      <p className="max-w-md self-start text-sm text-zinc-600">
        Print or display this at the venue entrance. Registered participants scan it to
        self-check-in — it only works from{' '}
        {new Date(occurrence.startsAt.getTime() - 30 * 60_000).toLocaleTimeString()} to{' '}
        {new Date(occurrence.endsAt.getTime() + 2 * 60 * 60_000).toLocaleTimeString()}.
      </p>
      {/* Server-generated SVG from the qrcode package, not user input. */}
      <div
        className="rounded-2xl border border-zinc-200 bg-white p-6"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <div className="w-full max-w-md rounded-lg bg-zinc-50 p-3 font-mono text-xs break-all text-zinc-600">
        {checkInUrl}
      </div>
    </div>
  );
}
