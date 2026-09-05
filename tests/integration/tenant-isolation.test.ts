import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { ForbiddenError } from '@/modules/organizations';
import {
  updateCohortStatus,
  duplicateProgram,
  addWeek,
  reorderWeeks,
  upsertModule,
  deleteModule,
  toggleModulePublish,
  reorderModules,
  replaceQuizQuestions,
  gradeSubmission,
  overrideAttendance,
  generateInvitation,
  getCohortRoster,
  getSubmissionsForCohort,
  getInvitationsForCohort,
  submitAssignment,
} from '@/modules/learning';
import {
  createEvent,
  createOccurrence,
  updateOccurrenceStatus,
  getOccurrenceDetail,
  getEventWithOccurrences,
  getRegistrationsForOccurrence,
  getFeedbackForOccurrence,
  adminCheckIn,
  registerForOccurrence,
} from '@/modules/events';
import {
  createTestOrg,
  createTestAdmin,
  createTestUser,
  createLiveCohortWithModules,
  enrolUser,
  cleanupOrg,
} from '../support/fixtures';

/**
 * The gap the Phase 2 review surfaced: assertOrgAdmin proves *who* may act,
 * but until this hardening pass nothing proved the *resource* an admin acts
 * on belongs to their org. These tests drive the module layer directly with
 * a foreign organizationId and assert every admin mutation/read throws
 * ForbiddenError — the check that lets a second Organization exist safely.
 * Org A owns all the resources; Org B is the attacker's org.
 */
describe('tenant isolation — resource ownership (org B cannot touch org A)', () => {
  let orgAId: string;
  let orgBId: string;
  let orgAAdminId: string;
  let orgBAdminId: string;
  let cohortId: string;
  let courseVersionId: string;
  let weekId: string;
  let quizModuleId: string;
  let assignmentModuleId: string;
  let recordingModuleId: string;
  let submissionId: string;
  let eventId: string;
  let occurrenceId: string;
  let participantId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    const orgA = await createTestOrg();
    const orgB = await createTestOrg();
    orgAId = orgA.id;
    orgBId = orgB.id;

    const adminA = await createTestAdmin(orgAId);
    const adminB = await createTestAdmin(orgBId);
    orgAAdminId = adminA.userId;
    orgBAdminId = adminB.userId;
    userIds.push(orgAAdminId, orgBAdminId);

    const cohort = await createLiveCohortWithModules({
      organizationId: orgAId,
      ownerUserId: orgAAdminId,
    });
    cohortId = cohort.cohortId;
    weekId = cohort.weekId;
    quizModuleId = cohort.quizModuleId;
    assignmentModuleId = cohort.assignmentModuleId;
    recordingModuleId = cohort.recordingModuleId;
    courseVersionId = (
      await prisma.cohort.findUniqueOrThrow({
        where: { id: cohortId },
        select: { courseVersionId: true },
      })
    ).courseVersionId;

    const participant = await createTestUser('Org A Participant');
    participantId = participant.userId;
    userIds.push(participantId);
    await enrolUser({
      cohortId,
      userId: participantId,
      email: participant.email,
      createdByUserId: orgAAdminId,
    });
    await submitAssignment({
      userId: participantId,
      assignmentModuleId,
      bodyText: 'A submission.',
    });
    submissionId = (await prisma.submission.findFirstOrThrow({ where: { userId: participantId } }))
      .id;

    const { eventId: evId } = await createEvent({ organizationId: orgAId, title: 'Org A Event' });
    eventId = evId;
    const now = new Date();
    const occ = await createOccurrence({
      eventId,
      organizationId: orgAId,
      ownerUserId: orgAAdminId,
      startsAt: new Date(now.getTime() - 5 * 60 * 1000),
      endsAt: new Date(now.getTime() + 60 * 60 * 1000),
    });
    occurrenceId = occ.occurrenceId;
  });

  afterAll(async () => {
    await cleanupOrg(orgAId, []);
    await cleanupOrg(orgBId, userIds);
  });

  // --- Learning mutations ---
  it('denies updateCohortStatus on a foreign cohort', async () => {
    await expect(
      updateCohortStatus({
        cohortId,
        organizationId: orgBId,
        actingUserId: orgBAdminId,
        status: 'ARCHIVED',
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('denies duplicateProgram of a foreign cohort', async () => {
    await expect(
      duplicateProgram({
        cohortId,
        organizationId: orgBId,
        actingUserId: orgBAdminId,
        newCohortLabel: 'Stolen copy',
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('denies curriculum edits (addWeek/reorderWeeks) on a foreign course version', async () => {
    await expect(addWeek({ courseVersionId, organizationId: orgBId })).rejects.toThrow(
      ForbiddenError,
    );
    await expect(
      reorderWeeks({ courseVersionId, organizationId: orgBId, orderedWeekIds: [weekId] }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('denies module edits (upsert/delete/toggle/reorder/quiz) on a foreign week/module', async () => {
    await expect(
      upsertModule({
        weekId,
        organizationId: orgBId,
        title: 'Injected',
        isPublished: true,
        fields: { type: 'READING', contentUrl: 'https://x' },
      }),
    ).rejects.toThrow(ForbiddenError);
    await expect(deleteModule(quizModuleId, orgBId)).rejects.toThrow(ForbiddenError);
    await expect(toggleModulePublish(quizModuleId, orgBId)).rejects.toThrow(ForbiddenError);
    await expect(
      reorderModules({ weekId, organizationId: orgBId, orderedModuleIds: [quizModuleId] }),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      replaceQuizQuestions({ quizModuleId, organizationId: orgBId, questions: [] }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('denies grading a foreign submission', async () => {
    await expect(
      gradeSubmission({
        submissionId,
        organizationId: orgBId,
        label: 'GOOD',
        feedback: 'nope',
        gradedByUserId: orgBAdminId,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('denies overriding attendance on a foreign recording', async () => {
    await expect(
      overrideAttendance({
        userId: participantId,
        recordingModuleId,
        organizationId: orgBId,
        overriddenByUserId: orgBAdminId,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('denies inviting into a foreign cohort', async () => {
    await expect(
      generateInvitation({
        cohortId,
        organizationId: orgBId,
        email: 'intruder@example.test',
        createdByUserId: orgBAdminId,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  // --- Learning reads (PII) ---
  it('denies reading a foreign roster / submissions / invitations', async () => {
    await expect(getCohortRoster(cohortId, orgBId)).rejects.toThrow(ForbiddenError);
    await expect(getSubmissionsForCohort(cohortId, orgBId)).rejects.toThrow(ForbiddenError);
    await expect(getInvitationsForCohort(cohortId, orgBId)).rejects.toThrow(ForbiddenError);
  });

  // --- Events ---
  it('denies creating an occurrence under a foreign event', async () => {
    const now = new Date();
    await expect(
      createOccurrence({
        eventId,
        organizationId: orgBId,
        ownerUserId: orgBAdminId,
        startsAt: now,
        endsAt: new Date(now.getTime() + 60 * 60 * 1000),
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('denies status change / detail / roster / feedback / check-in on a foreign occurrence', async () => {
    await expect(
      updateOccurrenceStatus({
        occurrenceId,
        organizationId: orgBId,
        actingUserId: orgBAdminId,
        status: 'CANCELLED',
      }),
    ).rejects.toThrow(ForbiddenError);
    await expect(getOccurrenceDetail(occurrenceId, orgBId)).rejects.toThrow(ForbiddenError);
    await expect(getEventWithOccurrences(eventId, orgBId)).rejects.toThrow(ForbiddenError);
    await expect(getRegistrationsForOccurrence(occurrenceId, orgBId)).rejects.toThrow(
      ForbiddenError,
    );
    await expect(getFeedbackForOccurrence(occurrenceId, orgBId)).rejects.toThrow(ForbiddenError);
    await expect(
      adminCheckIn({
        userId: participantId,
        eventOccurrenceId: occurrenceId,
        organizationId: orgBId,
        checkedInByUserId: orgBAdminId,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  // --- Positive controls: the real owner still succeeds ---
  it('still allows the owning org to act on its own resources', async () => {
    await expect(getCohortRoster(cohortId, orgAId)).resolves.toBeDefined();
    await expect(getOccurrenceDetail(occurrenceId, orgAId)).resolves.toBeDefined();
    await expect(getEventWithOccurrences(eventId, orgAId)).resolves.toBeDefined();

    // The occurrence needs to be LIVE for a participant to register, then the
    // owning admin can check them in — all with org A's id.
    await updateOccurrenceStatus({
      occurrenceId,
      organizationId: orgAId,
      actingUserId: orgAAdminId,
      status: 'LIVE',
    });
    await registerForOccurrence({
      userId: participantId,
      eventOccurrenceId: occurrenceId,
      organizationId: orgAId,
    });
    await expect(
      adminCheckIn({
        userId: participantId,
        eventOccurrenceId: occurrenceId,
        organizationId: orgAId,
        checkedInByUserId: orgAAdminId,
      }),
    ).resolves.toBeUndefined();
  });
});
