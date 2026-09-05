import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { createUserWithEmailPassword } from '@/modules/identity';
import {
  createProgram,
  updateCohortStatus,
  upsertModule,
  replaceQuizQuestions,
  generateInvitation,
  acceptInvitationByToken,
} from '@/modules/learning';

/** A fresh Organization per test suite — deleting it cascades everything scoped to it (see cleanupOrg). */
export async function createTestOrg() {
  const id = randomUUID();
  return prisma.organization.create({
    data: { name: `Test Org ${id.slice(0, 8)}`, slug: `test-org-${id}`, timezone: 'Asia/Karachi' },
  });
}

export async function createTestAdmin(organizationId: string) {
  const email = `admin-${randomUUID()}@example.test`;
  const { userId } = await createUserWithEmailPassword({
    name: 'Test Admin',
    email,
    password: 'TestPass123!',
    verifyImmediately: true,
  });
  await prisma.organizationMembership.create({ data: { userId, organizationId, role: 'OWNER' } });
  return { userId, email };
}

export async function createTestUser(name = 'Test Participant') {
  const email = `${name.toLowerCase().replace(/\s+/g, '-')}-${randomUUID()}@example.test`;
  const { userId } = await createUserWithEmailPassword({
    name,
    email,
    password: 'TestPass123!',
    verifyImmediately: true,
  });
  return { userId, email };
}

/**
 * A live cohort with one week's RECORDING/READING (from createProgram's
 * default seeding) plus a QUIZ and an ASSIGNMENT module, ready for
 * enrolment. Mirrors the setup used to manually verify Tasks 10-12.
 */
export async function createLiveCohortWithModules(input: {
  organizationId: string;
  ownerUserId: string;
}) {
  const { cohortId } = await createProgram({
    organizationId: input.organizationId,
    title: `Test Course ${randomUUID().slice(0, 8)}`,
    cohortLabel: 'Cohort A',
    weekCount: 1,
    ownerUserId: input.ownerUserId,
  });

  const week = await prisma.week.findFirstOrThrow({
    where: { courseVersion: { cohorts: { some: { id: cohortId } } } },
    orderBy: { orderIndex: 'asc' },
  });
  const recordingModule = await prisma.module.findFirstOrThrow({
    where: { weekId: week.id, type: 'RECORDING' },
  });
  const readingModule = await prisma.module.findFirstOrThrow({
    where: { weekId: week.id, type: 'READING' },
  });

  const { moduleId: quizModuleId } = await upsertModule({
    weekId: week.id,
    organizationId: input.organizationId,
    title: 'Quiz 1',
    isPublished: true,
    fields: { type: 'QUIZ', title: 'Quiz 1' },
  });
  await replaceQuizQuestions({
    quizModuleId,
    organizationId: input.organizationId,
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

  const { moduleId: assignmentModuleId } = await upsertModule({
    weekId: week.id,
    organizationId: input.organizationId,
    title: 'Essay 1',
    isPublished: true,
    fields: {
      type: 'ASSIGNMENT',
      prompt: 'Write about resilience.',
      softDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await updateCohortStatus({
    cohortId,
    organizationId: input.organizationId,
    actingUserId: input.ownerUserId,
    status: 'LIVE',
  });

  return {
    cohortId,
    weekId: week.id,
    recordingModuleId: recordingModule.id,
    readingModuleId: readingModule.id,
    quizModuleId,
    assignmentModuleId,
  };
}

export async function enrolUser(input: {
  cohortId: string;
  userId: string;
  email: string;
  createdByUserId: string;
}) {
  const cohort = await prisma.cohort.findUniqueOrThrow({
    where: { id: input.cohortId },
    select: { organizationId: true },
  });
  const { url } = await generateInvitation({
    cohortId: input.cohortId,
    organizationId: cohort.organizationId,
    email: input.email,
    createdByUserId: input.createdByUserId,
  });
  const rawToken = url.split('/join/')[1];
  await acceptInvitationByToken({ rawToken, userId: input.userId });
}

/** Deletes the org (cascades everything scoped to it) then the given users (global identities, not org-scoped). */
export async function cleanupOrg(organizationId: string, userIds: string[]) {
  await prisma.organization.delete({ where: { id: organizationId } });
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}
