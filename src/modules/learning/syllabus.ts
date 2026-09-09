import 'server-only';
import { prisma } from '@/lib/prisma';
import { startOfDay } from '@/lib/dates';
import type { ModuleType } from '@/generated/prisma/client';
import { computeModuleState, type ModuleState } from './module-state';

/** URL segment for a module page, by type. */
export const MODULE_ROUTE: Record<ModuleType, string> = {
  RECORDING: 'recording',
  READING: 'reading',
  QUIZ: 'quiz',
  ASSIGNMENT: 'assignment',
};

export type SyllabusModule = {
  id: string;
  type: ModuleType;
  title: string;
  route: string;
  locked: boolean;
  state: ModuleState | null; // null when the week isn't released yet
  deadline: Date | null; // assignment soft deadline, if any
  dueInDays: number | null; // whole days until deadline (negative = overdue)
};

export type SyllabusWeek = {
  id: string;
  orderIndex: number;
  title: string;
  startsOn: Date | null;
  endsOn: Date | null;
  released: boolean;
  current: boolean;
  modules: SyllabusModule[];
  done: number;
  total: number;
};

export type NextModule = {
  weekId: string;
  moduleId: string;
  type: ModuleType;
  title: string;
  route: string;
} | null;

export type Syllabus = {
  weeks: SyllabusWeek[];
  done: number;
  total: number;
  percent: number;
  nextModule: NextModule;
  currentWeekId: string | null;
};

function daysUntil(deadline: Date, today: Date): number {
  return Math.round((startOfDay(deadline).getTime() - today.getTime()) / 86_400_000);
}

/**
 * The whole course as the participant sees it: every week with its schedule
 * dates, its published modules (with per-user completion state + assignment
 * deadlines), per-week and overall progress, and the next module to do.
 * "Released" = the week's CohortSession has started (matches the plan's
 * "released so far" default); locked weeks are shown but their modules carry
 * no state and can't be counted. Composes computeModuleState — no schema change.
 */
export async function getSyllabus(userId: string, cohortId: string): Promise<Syllabus> {
  const cohort = await prisma.cohort.findUniqueOrThrow({
    where: { id: cohortId },
    select: { courseVersionId: true },
  });

  const [weeks, sessions] = await Promise.all([
    prisma.week.findMany({
      where: { courseVersionId: cohort.courseVersionId },
      orderBy: { orderIndex: 'asc' },
      include: { modules: { where: { isPublished: true }, orderBy: { orderIndex: 'asc' } } },
    }),
    prisma.cohortSession.findMany({
      where: { cohortId },
      select: { weekId: true, startsOn: true, endsOn: true },
    }),
  ]);
  const sessionByWeek = new Map(sessions.map((s) => [s.weekId, s]));

  const today = startOfDay(new Date());

  // Highest-orderIndex week whose session has started = "current".
  let currentOrderIndex = -1;
  let currentWeekId: string | null = null;
  for (const w of weeks) {
    const s = sessionByWeek.get(w.id);
    const released = !s || s.startsOn <= today;
    if (released && w.orderIndex > currentOrderIndex) {
      currentOrderIndex = w.orderIndex;
      currentWeekId = w.id;
    }
  }

  // Assignment deadlines for every published assignment module in the course.
  const assignmentIds = weeks.flatMap((w) =>
    w.modules.filter((m) => m.type === 'ASSIGNMENT').map((m) => m.id),
  );
  const assignmentDeadlines = assignmentIds.length
    ? await prisma.assignmentModule.findMany({
        where: { moduleId: { in: assignmentIds } },
        select: { moduleId: true, softDeadline: true },
      })
    : [];
  const deadlineByModule = new Map(assignmentDeadlines.map((a) => [a.moduleId, a.softDeadline]));

  const outWeeks: SyllabusWeek[] = [];
  let done = 0;
  let total = 0;
  let nextModule: NextModule = null;

  for (const w of weeks) {
    const s = sessionByWeek.get(w.id);
    const released = !s || s.startsOn <= today;

    // Compute states in parallel for released weeks only.
    const states = released
      ? await Promise.all(w.modules.map((m) => computeModuleState(userId, m)))
      : [];

    let weekDone = 0;
    const modules: SyllabusModule[] = w.modules.map((m, i) => {
      const state = released ? states[i] : null;
      const deadline = deadlineByModule.get(m.id) ?? null;
      if (released) {
        total++;
        if (state!.tone === 'done') {
          done++;
          weekDone++;
        } else if (!nextModule) {
          nextModule = {
            weekId: w.id,
            moduleId: m.id,
            type: m.type,
            title: m.title,
            route: MODULE_ROUTE[m.type],
          };
        }
      }
      return {
        id: m.id,
        type: m.type,
        title: m.title,
        route: MODULE_ROUTE[m.type],
        locked: !released,
        state,
        deadline,
        dueInDays: deadline ? daysUntil(deadline, today) : null,
      };
    });

    outWeeks.push({
      id: w.id,
      orderIndex: w.orderIndex,
      title: w.title,
      startsOn: s?.startsOn ?? null,
      endsOn: s?.endsOn ?? null,
      released,
      current: w.id === currentWeekId,
      modules,
      done: weekDone,
      total: released ? w.modules.length : 0,
    });
  }

  return {
    weeks: outWeeks,
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    nextModule,
    currentWeekId,
  };
}

/**
 * Previous/next module in course order, across weeks, over released+published
 * modules only — powers the in-module "← Prev / Next →" navigation so a
 * learner moves linearly through the course.
 */
export async function getModuleNeighbors(
  cohortId: string,
  currentModuleId: string,
): Promise<{
  prev: { weekId: string; moduleId: string; route: string; title: string } | null;
  next: { weekId: string; moduleId: string; route: string; title: string } | null;
}> {
  const cohort = await prisma.cohort.findUniqueOrThrow({
    where: { id: cohortId },
    select: { courseVersionId: true },
  });

  const [weeks, sessions] = await Promise.all([
    prisma.week.findMany({
      where: { courseVersionId: cohort.courseVersionId },
      orderBy: { orderIndex: 'asc' },
      include: { modules: { where: { isPublished: true }, orderBy: { orderIndex: 'asc' } } },
    }),
    prisma.cohortSession.findMany({ where: { cohortId }, select: { weekId: true, startsOn: true } }),
  ]);
  const sessionByWeek = new Map(sessions.map((s) => [s.weekId, s]));
  const today = startOfDay(new Date());

  const flat: Array<{ weekId: string; moduleId: string; route: string; title: string }> = [];
  for (const w of weeks) {
    const s = sessionByWeek.get(w.id);
    const released = !s || s.startsOn <= today;
    if (!released) continue;
    for (const m of w.modules) {
      flat.push({ weekId: w.id, moduleId: m.id, route: MODULE_ROUTE[m.type], title: m.title });
    }
  }

  const idx = flat.findIndex((f) => f.moduleId === currentModuleId);
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}
