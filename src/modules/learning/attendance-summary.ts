import 'server-only';
import { prisma } from '@/lib/prisma';
import { startOfDay } from '@/lib/dates';

/**
 * Average attendance % across a cohort's active roster, for released
 * recordings only (weeks whose CohortSession has started) — matches the
 * plan's "released so far" denominator default. Returns null when there's
 * nothing to measure yet (no sessions released, or no active enrolments).
 */
export async function computeCohortAttendanceAverage(cohortId: string): Promise<number | null> {
  const today = startOfDay(new Date());

  const [pastSessions, enrolments] = await Promise.all([
    prisma.cohortSession.findMany({
      where: { cohortId, startsOn: { lte: today } },
      select: { weekId: true },
    }),
    prisma.enrolment.findMany({ where: { cohortId, status: 'ACTIVE' }, select: { userId: true } }),
  ]);

  if (pastSessions.length === 0 || enrolments.length === 0) return null;

  const recordingModules = await prisma.recordingModule.findMany({
    where: { module: { weekId: { in: pastSessions.map((s) => s.weekId) } } },
    select: { moduleId: true },
  });
  if (recordingModules.length === 0) return null;

  const confirmedCount = await prisma.attendanceRecord.count({
    where: {
      recordingModuleId: { in: recordingModules.map((r) => r.moduleId) },
      userId: { in: enrolments.map((e) => e.userId) },
      attendanceConfirmedAt: { not: null },
    },
  });

  const denominator = recordingModules.length * enrolments.length;
  return Math.round((confirmedCount / denominator) * 100);
}

/** Same denominator logic as computeCohortAttendanceAverage, for one participant — powers the Home dashboard's ATTENDANCE stat. */
export async function computeUserAttendancePercent(
  userId: string,
  cohortId: string,
): Promise<number> {
  const today = startOfDay(new Date());

  const pastSessions = await prisma.cohortSession.findMany({
    where: { cohortId, startsOn: { lte: today } },
    select: { weekId: true },
  });
  if (pastSessions.length === 0) return 0;

  const recordingModules = await prisma.recordingModule.findMany({
    where: { module: { weekId: { in: pastSessions.map((s) => s.weekId) } } },
    select: { moduleId: true },
  });
  if (recordingModules.length === 0) return 0;

  const confirmedCount = await prisma.attendanceRecord.count({
    where: {
      userId,
      recordingModuleId: { in: recordingModules.map((r) => r.moduleId) },
      attendanceConfirmedAt: { not: null },
    },
  });

  return Math.round((confirmedCount / recordingModules.length) * 100);
}
