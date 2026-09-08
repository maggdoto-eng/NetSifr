import { prisma } from '@/lib/prisma';
import { getDefaultOrganization } from '@/lib/org';
import { computeCohortAttendanceAverage } from '@/modules/learning';
import { NewProgramForm } from './new-program-form';
import { ProgramCard } from './program-card';

export default async function ProgramsPage() {
  const org = await getDefaultOrganization();
  const cohorts = await prisma.cohort.findMany({
    where: { organizationId: org.id },
    include: {
      opportunity: true,
      courseVersion: { include: { weeks: true } },
      enrolments: { where: { status: 'ACTIVE' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const cards = await Promise.all(
    cohorts.map(async (cohort) => ({
      cohortId: cohort.id,
      title: cohort.opportunity.title,
      cohortLabel: cohort.cohortLabel,
      status: cohort.status,
      enrolledCount: cohort.enrolments.length,
      weekCount: cohort.courseVersion.weeks.length,
      attendanceAverage: await computeCohortAttendanceAverage(cohort.id),
    })),
  );

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-end justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold">Programs</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600">
            Every cohort NetSifr runs. Each has its own weeks, roster, attendance and reporting —
            the structure is reused, the content isn&apos;t.
          </p>
        </div>
      </div>

      <NewProgramForm />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <ProgramCard key={card.cohortId} {...card} />
        ))}
      </div>

      {cards.length === 0 && (
        <p className="rounded border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          No programs yet — create the first one above.
        </p>
      )}
    </div>
  );
}
