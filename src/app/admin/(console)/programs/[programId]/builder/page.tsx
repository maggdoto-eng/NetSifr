import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { WeekList } from './week-list';
import { ModuleList } from './module-list';
import { ModuleInspector, type ModuleDetail } from './module-inspector';

async function loadModuleDetail(moduleId: string, type: string): Promise<ModuleDetail | undefined> {
  if (type === 'RECORDING') {
    const recording = await prisma.recordingModule.findUnique({ where: { moduleId } });
    if (!recording) return undefined;
    return {
      type: 'RECORDING',
      driveFileId: recording.driveFileId,
      unlockMinutesOverride: recording.unlockMinutesOverride,
    };
  }
  if (type === 'READING') {
    const reading = await prisma.readingModule.findUnique({ where: { moduleId } });
    if (!reading) return undefined;
    return { type: 'READING', contentUrl: reading.contentUrl };
  }
  if (type === 'ASSIGNMENT') {
    const assignment = await prisma.assignmentModule.findUnique({ where: { moduleId } });
    if (!assignment) return undefined;
    return {
      type: 'ASSIGNMENT',
      prompt: assignment.prompt,
      // datetime-local input wants "YYYY-MM-DDTHH:mm"
      softDeadline: assignment.softDeadline.toISOString().slice(0, 16),
    };
  }
  if (type === 'QUIZ') {
    const quiz = await prisma.quizModule.findUnique({
      where: { moduleId },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: { options: { orderBy: { orderIndex: 'asc' } } },
        },
      },
    });
    if (!quiz) return undefined;
    return {
      type: 'QUIZ',
      quizModuleId: quiz.moduleId,
      questions: quiz.questions.map((q) => ({
        prompt: q.prompt,
        options: q.options.map((o) => ({ label: o.label, isCorrect: o.isCorrect })),
      })),
    };
  }
  return undefined;
}

export default async function BuilderPage({
  params,
  searchParams,
}: PageProps<'/admin/programs/[programId]/builder'>) {
  const { programId } = await params;
  const search = await searchParams;
  const weekParam = typeof search.week === 'string' ? search.week : undefined;
  const moduleParam = typeof search.module === 'string' ? search.module : undefined;

  const cohort = await prisma.cohort.findUnique({
    where: { id: programId },
    include: {
      courseVersion: {
        include: {
          weeks: {
            orderBy: { orderIndex: 'asc' },
            include: { modules: { orderBy: { orderIndex: 'asc' } } },
          },
        },
      },
    },
  });
  if (!cohort) notFound();

  const weeks = cohort.courseVersion.weeks;
  const selectedWeek = weeks.find((w) => w.id === weekParam) ?? weeks[0];
  const modules = selectedWeek?.modules ?? [];
  const selectedModule = modules.find((m) => m.id === moduleParam) ?? modules[0];
  const locked = !!cohort.courseVersion.lockedAt;

  const moduleDetail = selectedModule
    ? await loadModuleDetail(selectedModule.id, selectedModule.type)
    : undefined;

  return (
    <div className="flex h-full min-h-0">
      <WeekList
        programId={programId}
        courseVersionId={cohort.courseVersionId}
        weeks={weeks.map((w) => ({
          id: w.id,
          orderIndex: w.orderIndex,
          title: w.title,
          moduleCount: w.modules.length,
        }))}
        selectedWeekId={selectedWeek?.id}
        locked={locked}
      />
      <ModuleList
        programId={programId}
        weekId={selectedWeek?.id}
        weekTitle={selectedWeek?.title}
        modules={modules.map((m) => ({
          id: m.id,
          type: m.type,
          title: m.title,
          isPublished: m.isPublished,
        }))}
        selectedModuleId={selectedModule?.id}
        locked={locked}
      />
      <ModuleInspector
        // Forces a full remount on every module switch — otherwise React
        // reuses the uncontrolled title/isPublished form fields (they sit
        // outside the type-specific conditional blocks) across selections,
        // silently saving stale data from the previously-selected module.
        key={selectedModule?.id ?? 'none'}
        programId={programId}
        weekId={selectedWeek?.id ?? ''}
        module={
          selectedModule
            ? {
                id: selectedModule.id,
                title: selectedModule.title,
                isPublished: selectedModule.isPublished,
              }
            : undefined
        }
        detail={moduleDetail}
        locked={locked}
      />
    </div>
  );
}
