import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { prisma } from '../../src/lib/prisma';

/**
 * Plain Node subprocess (see global-teardown.ts) — deletes exactly what
 * seed-fixture.ts created, scoped by the fixture's own course title. Never
 * touches the shared Organization row itself (seed-fixture.ts reuses the
 * real seeded org, since Phase 1's admin routing isn't multi-tenant-aware).
 */
async function main() {
  const fixturePath = process.argv[2];
  if (!fixturePath || !existsSync(fixturePath)) return;
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'));

  // AuditEvent rows (written by updateCohortStatus) reference the admin as
  // actor with no cascade from User — delete them before the User rows.
  await prisma.auditEvent.deleteMany({ where: { actorUserId: fixture.adminUserId } });

  // Opportunity -> Cohort (cascade) and Course -> CourseVersion/Week/Module
  // (cascade) together take the whole course tree, including Enrolment,
  // Invitation, and ContributionEvent rows scoped to that cohort.
  await prisma.opportunity.deleteMany({ where: { title: fixture.courseTitle } });
  await prisma.course.deleteMany({ where: { title: fixture.courseTitle } });

  // Event -> EventOccurrence (cascade) takes registrations/checkIns/feedback
  // and ContributionEvent rows for that occurrence, but not the paired
  // Opportunity row (only cascades Opportunity -> EventOccurrence, not the
  // reverse) — delete that separately, same as the course's Opportunity row.
  if (fixture.eventTitle) {
    await prisma.opportunity.deleteMany({ where: { title: fixture.eventTitle } });
    await prisma.event.deleteMany({ where: { title: fixture.eventTitle } });
  }

  // The VolunteerOpportunity cascades from its Opportunity envelope (shared
  // title); ContributionEvent rows for verified hours cascade from the admin
  // User delete below.
  if (fixture.volunteerTitle) {
    await prisma.opportunity.deleteMany({ where: { title: fixture.volunteerTitle } });
  }

  const participant = await prisma.credential.findUnique({
    where: { type_identifier: { type: 'EMAIL_PASSWORD', identifier: fixture.participantEmail } },
  });
  const userIds = [fixture.adminUserId, participant?.userId].filter(
    (id): id is string => typeof id === 'string',
  );
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
