import 'server-only';
import { prisma } from '@/lib/prisma';
import { startOfDay } from '@/lib/dates';
import type { ModuleType } from '@/generated/prisma/client';

export type ModuleStateTone = 'done' | 'due' | 'late' | 'open';
export type ModuleState = { label: string; tone: ModuleStateTone };

/**
 * Which CohortSession counts as "now" for a cohort — the latest session
 * whose startsOn has arrived (or the first, if the cohort hasn't started
 * yet). Drives the Home dashboard's "this week", the attendance-%
 * denominator, and which week's modules are "current".
 */
export async function getCurrentCohortSession(cohortId: string) {
  const sessions = await prisma.cohortSession.findMany({
    where: { cohortId },
    orderBy: { startsOn: 'asc' },
    include: { week: true },
  });
  if (sessions.length === 0) return null;

  const today = startOfDay(new Date());
  let current = sessions[0];
  for (const session of sessions) {
    if (session.startsOn <= today) current = session;
  }
  return current;
}

export async function getPublishedModulesForWeek(weekId: string) {
  return prisma.module.findMany({
    where: { weekId, isPublished: true },
    orderBy: { orderIndex: 'asc' },
  });
}

async function computeRecordingState(
  userId: string,
  recordingModuleId: string,
): Promise<ModuleState> {
  const record = await prisma.attendanceRecord.findUnique({
    where: { userId_recordingModuleId: { userId, recordingModuleId } },
  });
  if (record?.attendanceConfirmedAt) return { label: 'ATTENDED', tone: 'done' };
  if (record && record.engagedSeconds > 0) return { label: 'IN PROGRESS', tone: 'due' };
  return { label: 'NOT STARTED', tone: 'open' };
}

async function computeReadingState(userId: string, readingModuleId: string): Promise<ModuleState> {
  const progress = await prisma.readingProgress.findUnique({
    where: { userId_readingModuleId: { userId, readingModuleId } },
  });
  return progress ? { label: 'READ', tone: 'done' } : { label: 'NOT STARTED', tone: 'open' };
}

async function computeQuizState(userId: string, quizModuleId: string): Promise<ModuleState> {
  const best = await prisma.quizAttempt.findFirst({
    where: { userId, quizModuleId },
    orderBy: { scorePercent: 'desc' },
  });
  return best ? { label: `${best.scorePercent}%`, tone: 'done' } : { label: 'DUE', tone: 'due' };
}

async function computeAssignmentState(
  userId: string,
  assignmentModuleId: string,
): Promise<ModuleState> {
  const [assignment, latest] = await Promise.all([
    prisma.assignmentModule.findUniqueOrThrow({ where: { moduleId: assignmentModuleId } }),
    prisma.submission.findFirst({
      where: { userId, assignmentModuleId },
      orderBy: { attemptNumber: 'desc' },
      include: { grade: true },
    }),
  ]);

  if (latest?.grade) return { label: 'GRADED', tone: 'done' };
  if (latest) return { label: latest.isLate ? 'SUBMITTED · LATE' : 'SUBMITTED', tone: 'done' };

  const isPastDue = assignment.softDeadline < new Date();
  return isPastDue ? { label: 'LATE', tone: 'late' } : { label: 'DUE', tone: 'due' };
}

export async function computeModuleState(
  userId: string,
  module_: { id: string; type: ModuleType },
): Promise<ModuleState> {
  switch (module_.type) {
    case 'RECORDING':
      return computeRecordingState(userId, module_.id);
    case 'READING':
      return computeReadingState(userId, module_.id);
    case 'QUIZ':
      return computeQuizState(userId, module_.id);
    case 'ASSIGNMENT':
      return computeAssignmentState(userId, module_.id);
  }
}

/**
 * % of published modules in released-so-far weeks that are "done" for this
 * user — matches the plan's "released so far" denominator default. Used by
 * the /programs picker; Task 12's ContributionEvent ledger is the source
 * for points, not this.
 */
export async function computeCohortProgressPercent(
  userId: string,
  cohortId: string,
): Promise<number> {
  const currentSession = await getCurrentCohortSession(cohortId);
  if (!currentSession) return 0;

  const releasedWeeks = await prisma.week.findMany({
    where: {
      courseVersionId: currentSession.week.courseVersionId,
      orderIndex: { lte: currentSession.week.orderIndex },
    },
    include: { modules: { where: { isPublished: true } } },
  });

  let total = 0;
  let done = 0;
  for (const week of releasedWeeks) {
    for (const module_ of week.modules) {
      total++;
      const state = await computeModuleState(userId, module_);
      if (state.tone === 'done') done++;
    }
  }
  return total ? Math.round((done / total) * 100) : 0;
}
