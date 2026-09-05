import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { avatarFor } from '@/lib/avatars';

export default async function CohortPage({ params }: PageProps<'/programs/[programId]/cohort'>) {
  const { programId } = await params;

  const cohort = await prisma.cohort.findUnique({ where: { id: programId } });
  if (!cohort) notFound();

  const enrolments = await prisma.enrolment.findMany({
    where: { cohortId: programId, status: 'ACTIVE' },
    include: { user: { include: { persona: true } } },
    orderBy: { user: { name: 'asc' } },
  });

  return (
    <div className="flex flex-col gap-4 p-5">
      <div>
        <div className="font-mono text-[10px] tracking-wide text-zinc-500">
          {enrolments.length} PARTICIPANTS
        </div>
        <h1 className="mt-1 text-xl font-bold">This cohort</h1>
      </div>

      <div className="flex flex-col gap-2">
        {enrolments.map((enrolment) => {
          const avatar = avatarFor(enrolment.user.avatarKey);
          return (
            <div key={enrolment.id} className="flex items-center gap-3 rounded-xl bg-white p-3">
              <div
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm"
                style={{ background: avatar.bg, color: avatar.fg }}
              >
                {avatar.glyph}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{enrolment.user.name}</div>
                <div className="font-mono text-[9px] tracking-wide text-zinc-500">
                  {enrolment.user.persona?.name.toUpperCase() ?? '—'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
