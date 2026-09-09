import 'server-only';
import { prisma } from '@/lib/prisma';
import { startOfDay } from '@/lib/dates';
import type { ModuleType } from '@/generated/prisma/client';
import { MODULE_ROUTE } from './syllabus';

export type ProgressItem = {
  weekId: string;
  weekTitle: string;
  moduleId: string;
  moduleTitle: string;
  type: ModuleType;
  route: string;
  // per-type result
  quizBest: number | null;
  quizAttempts: number;
  gradeLabel: string | null;
  gradeFeedback: string | null;
  submittedLate: boolean;
  readingDone: boolean;
  attended: boolean;
};

export type ProgressReport = {
  points: number;
  pointsByType: Array<{ type: string; points: number }>;
  attendanceConfirmed: number;
  attendanceTotal: number;
  attendancePercent: number;
  items: ProgressItem[];
};

/**
 * One consolidated learner report for a cohort: every released module with its
 * result (quiz best score, assignment grade + feedback, reading done,
 * attendance), the attendance ratio, and a points breakdown from the
 * ContributionEvent ledger. Read-only; composes existing tables.
 */
export async function getProgressReport(userId: string, cohortId: string): Promise<ProgressReport> {
  const cohort = await prisma.cohort.findUniqueOrThrow({
    where: { id: cohortId },
    select: { courseVersionId: true },
  });
  const today = startOfDay(new Date());

  const [weeks, sessions] = await Promise.all([
    prisma.week.findMany({
      where: { courseVersionId: cohort.courseVersionId },
      orderBy: { orderIndex: 'asc' },
      include: { modules: { where: { isPublished: true }, orderBy: { orderIndex: 'asc' } } },
    }),
    prisma.cohortSession.findMany({ where: { cohortId }, select: { weekId: true, startsOn: true } }),
  ]);
  const releasedWeek = new Map(
    sessions.map((s) => [s.weekId, s.startsOn <= today]),
  );

  const releasedModules = weeks.flatMap((w) =>
    (releasedWeek.get(w.id) ?? true) ? w.modules.map((m) => ({ ...m, weekId: w.id, weekTitle: w.title })) : [],
  );
  const quizIds = releasedModules.filter((m) => m.type === 'QUIZ').map((m) => m.id);
  const assignmentIds = releasedModules.filter((m) => m.type === 'ASSIGNMENT').map((m) => m.id);
  const readingIds = releasedModules.filter((m) => m.type === 'READING').map((m) => m.id);
  const recordingIds = releasedModules.filter((m) => m.type === 'RECORDING').map((m) => m.id);

  const [quizAttempts, submissions, readings, attendance, points, byType] = await Promise.all([
    quizIds.length
      ? prisma.quizAttempt.findMany({
          where: { userId, quizModuleId: { in: quizIds } },
          select: { quizModuleId: true, scorePercent: true },
        })
      : [],
    assignmentIds.length
      ? prisma.submission.findMany({
          where: { userId, assignmentModuleId: { in: assignmentIds } },
          orderBy: { attemptNumber: 'desc' },
          include: { grade: true },
        })
      : [],
    readingIds.length
      ? prisma.readingProgress.findMany({
          where: { userId, readingModuleId: { in: readingIds } },
          select: { readingModuleId: true },
        })
      : [],
    recordingIds.length
      ? prisma.attendanceRecord.findMany({
          where: {
            userId,
            recordingModuleId: { in: recordingIds },
            attendanceConfirmedAt: { not: null },
          },
          select: { recordingModuleId: true },
        })
      : [],
    prisma.contributionEvent.aggregate({ where: { userId, cohortId }, _sum: { points: true } }),
    prisma.contributionEvent.groupBy({
      by: ['type'],
      where: { userId, cohortId },
      _sum: { points: true },
    }),
  ]);

  const bestQuiz = new Map<string, { best: number; attempts: number }>();
  for (const a of quizAttempts) {
    const cur = bestQuiz.get(a.quizModuleId) ?? { best: 0, attempts: 0 };
    bestQuiz.set(a.quizModuleId, {
      best: Math.max(cur.best, a.scorePercent),
      attempts: cur.attempts + 1,
    });
  }
  const latestSubmission = new Map<string, (typeof submissions)[number]>();
  for (const s of submissions) if (!latestSubmission.has(s.assignmentModuleId)) latestSubmission.set(s.assignmentModuleId, s);
  const readSet = new Set(readings.map((r) => r.readingModuleId));
  const attendedSet = new Set(attendance.map((a) => a.recordingModuleId));

  const items: ProgressItem[] = releasedModules.map((m) => {
    const quiz = bestQuiz.get(m.id);
    const sub = latestSubmission.get(m.id);
    return {
      weekId: m.weekId,
      weekTitle: m.weekTitle,
      moduleId: m.id,
      moduleTitle: m.title,
      type: m.type,
      route: MODULE_ROUTE[m.type],
      quizBest: m.type === 'QUIZ' ? (quiz ? quiz.best : null) : null,
      quizAttempts: quiz?.attempts ?? 0,
      gradeLabel: sub?.grade?.label ?? null,
      gradeFeedback: sub?.grade?.feedback ?? null,
      submittedLate: sub?.isLate ?? false,
      readingDone: m.type === 'READING' && readSet.has(m.id),
      attended: m.type === 'RECORDING' && attendedSet.has(m.id),
    };
  });

  return {
    points: points._sum.points ?? 0,
    pointsByType: byType
      .map((b) => ({ type: b.type, points: b._sum.points ?? 0 }))
      .sort((a, b) => b.points - a.points),
    attendanceConfirmed: attendedSet.size,
    attendanceTotal: recordingIds.length,
    attendancePercent: recordingIds.length
      ? Math.round((attendedSet.size / recordingIds.length) * 100)
      : 0,
    items,
  };
}
