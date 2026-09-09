import { prisma } from '@/lib/prisma';
import { getDefaultOrganization } from '@/lib/org';
import { computeCohortAttendanceAverage } from '@/modules/learning';
import { AdminTopbar } from '../admin-topbar';
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
    cohorts.map(async (cohort, index) => ({
      cohortId: cohort.id,
      title: cohort.opportunity.title,
      cohortLabel: cohort.cohortLabel,
      status: cohort.status,
      enrolledCount: cohort.enrolments.length,
      weekCount: cohort.courseVersion.weeks.length,
      attendanceAverage: await computeCohortAttendanceAverage(cohort.id),
      index,
    })),
  );

  return (
    <>
      <AdminTopbar trail={[{ label: 'Programs' }]} />
      <div className="a-main stack">
        <div>
          <h1 className="display-lg">Programs</h1>
          <p className="lede" style={{ marginTop: 8 }}>
            Every cohort NetSifr runs. Each program owns its own weeks, roster, attendance rules and
            reporting — the structure is reused, the content is not.
          </p>
        </div>

        <NewProgramForm />

        {cards.length > 0 ? (
          <div className="prog-grid">
            {cards.map((card) => (
              <ProgramCard key={card.cohortId} {...card} />
            ))}
          </div>
        ) : (
          <div className="empty">No programs yet — create the first one above.</div>
        )}
      </div>
    </>
  );
}
