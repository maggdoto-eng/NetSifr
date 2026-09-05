import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { prisma } from '../../src/lib/prisma';
import { createUserWithEmailPassword } from '../../src/modules/identity';
import {
  createProgram,
  updateCohortStatus,
  upsertModule,
  replaceQuizQuestions,
  generateInvitation,
} from '../../src/modules/learning';
import { createEvent, createOccurrence, updateOccurrenceStatus } from '../../src/modules/events';
import {
  createVolunteerOpportunity,
  updateVolunteerOpportunityStatus,
  addShift,
} from '../../src/modules/volunteering';

/**
 * Runs as a plain Node subprocess with --conditions=react-server (see
 * global-setup.ts) so the app's `import 'server-only'` guards resolve to a
 * no-op instead of throwing — that condition is normally only set by
 * Next's own bundler, never by plain Node, which is why this can't just be
 * imported directly into Playwright's own process. Writes its result
 * straight to a file (rather than stdout) so it can't collide with the
 * console noise the dev email sender writes when no provider is configured.
 */
async function main() {
  const outputPath = process.argv[2];
  if (!outputPath) throw new Error('Usage: seed-fixture.ts <output-json-path>');

  // Reuses the real seeded organization (matching getDefaultOrganization's
  // "oldest org" query) rather than creating a dedicated one — Phase 1's
  // admin panel isn't multi-tenant-aware in its routing, so a cohort under
  // any other org would 404 there. Teardown deletes only the specific rows
  // this script creates (never the Organization itself).
  const org = await prisma.organization.findFirstOrThrow({ orderBy: { createdAt: 'asc' } });
  const courseTitle = `E2E Course ${Date.now()}`;
  const adminEmail = `e2e-admin-${Date.now()}@example.test`;
  const admin = await createUserWithEmailPassword({
    name: 'E2E Admin',
    email: adminEmail,
    password: 'TestPass123!',
    verifyImmediately: true,
  });
  await prisma.organizationMembership.create({
    data: { userId: admin.userId, organizationId: org.id, role: 'OWNER' },
  });
  // Admin logs into /programs like anyone else, and that route redirects to
  // /onboarding until onboardedAt is set — skip that detour for this fixture.
  await prisma.user.update({ where: { id: admin.userId }, data: { onboardedAt: new Date() } });

  const { cohortId } = await createProgram({
    organizationId: org.id,
    title: courseTitle,
    cohortLabel: 'Cohort A',
    weekCount: 1,
    ownerUserId: admin.userId,
  });
  await updateCohortStatus({
    cohortId,
    organizationId: org.id,
    actingUserId: admin.userId,
    status: 'LIVE',
  });

  const participantEmail = `e2e-participant-${Date.now()}@example.test`;
  const { url: inviteUrl } = await generateInvitation({
    cohortId,
    organizationId: org.id,
    email: participantEmail,
    createdByUserId: admin.userId,
  });
  const inviteToken = inviteUrl.split('/join/')[1];

  const week = await prisma.week.findFirstOrThrow({
    where: { courseVersion: { cohorts: { some: { id: cohortId } } } },
    orderBy: { orderIndex: 'asc' },
  });
  const recordingModule = await prisma.module.findFirstOrThrow({
    where: { weekId: week.id, type: 'RECORDING' },
  });
  await prisma.recordingModule.update({
    where: { moduleId: recordingModule.id },
    data: { unlockMinutesOverride: 0 },
  });

  const { moduleId: quizModuleId } = await upsertModule({
    weekId: week.id,
    organizationId: org.id,
    title: 'Quiz 1',
    isPublished: true,
    fields: { type: 'QUIZ', title: 'Quiz 1' },
  });
  await replaceQuizQuestions({
    quizModuleId,
    organizationId: org.id,
    questions: [
      {
        prompt: 'What is 2 + 2?',
        options: [
          { label: '3', isCorrect: false },
          { label: '4', isCorrect: true },
        ],
      },
      {
        prompt: 'Capital of France?',
        options: [
          { label: 'Paris', isCorrect: true },
          { label: 'Berlin', isCorrect: false },
        ],
      },
    ],
  });

  await upsertModule({
    weekId: week.id,
    organizationId: org.id,
    title: 'Essay 1',
    isPublished: true,
    fields: {
      type: 'ASSIGNMENT',
      prompt: 'Write about resilience.',
      softDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const eventTitle = `E2E Event ${Date.now()}`;
  const { eventId } = await createEvent({ organizationId: org.id, title: eventTitle });
  const now = new Date();
  const { occurrenceId: eventOccurrenceId } = await createOccurrence({
    eventId,
    organizationId: org.id,
    ownerUserId: admin.userId,
    startsAt: new Date(now.getTime() - 5 * 60 * 1000),
    endsAt: new Date(now.getTime() + 60 * 60 * 1000),
    capacity: 1,
  });
  await updateOccurrenceStatus({
    occurrenceId: eventOccurrenceId,
    organizationId: org.id,
    actingUserId: admin.userId,
    status: 'LIVE',
  });
  const eventOccurrence = await prisma.eventOccurrence.findUniqueOrThrow({
    where: { id: eventOccurrenceId },
  });

  const volunteerTitle = `E2E Volunteer ${Date.now()}`;
  const { volunteerOpportunityId } = await createVolunteerOpportunity({
    organizationId: org.id,
    ownerUserId: admin.userId,
    title: volunteerTitle,
    description: 'Help out on the E2E cleanup crew.',
    locationMode: 'PHYSICAL',
  });
  const { shiftId: volunteerShiftId } = await addShift({
    volunteerOpportunityId,
    organizationId: org.id,
    title: 'Saturday morning',
    startsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    endsAt: new Date(now.getTime() + 27 * 60 * 60 * 1000),
    capacity: 5,
  });
  await updateVolunteerOpportunityStatus({
    volunteerOpportunityId,
    organizationId: org.id,
    actingUserId: admin.userId,
    status: 'OPEN',
  });

  writeFileSync(
    outputPath,
    JSON.stringify({
      courseTitle,
      adminUserId: admin.userId,
      adminEmail,
      adminPassword: 'TestPass123!',
      cohortId,
      weekId: week.id,
      recordingModuleId: recordingModule.id,
      participantEmail,
      inviteToken,
      eventTitle,
      eventId,
      eventOccurrenceId,
      eventCheckInToken: eventOccurrence.checkInToken,
      volunteerTitle,
      volunteerOpportunityId,
      volunteerShiftId,
    }),
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
