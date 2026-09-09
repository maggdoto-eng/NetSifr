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
    <div className="stack">
      <div>
        <div className="mono">{enrolments.length} participants</div>
        <h1 className="display-md" style={{ marginTop: 4 }}>
          This cohort
        </h1>
      </div>

      <div className="grid-3">
        {enrolments.map((enrolment) => {
          const avatar = avatarFor(enrolment.user.avatarKey);
          return (
            <div key={enrolment.id} className="person">
              <span className="avatar" style={{ background: avatar.bg, color: avatar.fg }}>
                {avatar.glyph}
              </span>
              <div className="grow">
                <div className="truncate" style={{ fontWeight: 600 }}>
                  {enrolment.user.name}
                </div>
                <div className="mono" style={{ marginTop: 2 }}>
                  {enrolment.user.persona?.name ?? '—'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
