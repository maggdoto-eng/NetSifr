'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  addWeek,
  reorderWeeks,
  reorderModules,
  upsertModule,
  deleteModule,
  toggleModulePublish,
  replaceQuizQuestions,
} from '@/modules/learning';
import { requireAdminContext } from '@/app/admin/action-context';

export type ModuleFormState = { error?: string } | undefined;

export async function addWeekAction(courseVersionId: string, programId: string): Promise<void> {
  const { organizationId } = await requireAdminContext();
  const { weekId } = await addWeek({ courseVersionId, organizationId });
  revalidatePath(`/admin/programs/${programId}/builder`);
  redirect(`/admin/programs/${programId}/builder?week=${weekId}`);
}

export async function moveWeekAction(input: {
  courseVersionId: string;
  weekId: string;
  direction: 'up' | 'down';
  programId: string;
}): Promise<void> {
  const { organizationId } = await requireAdminContext();
  const weeks = await prisma.week.findMany({
    where: { courseVersionId: input.courseVersionId },
    orderBy: { orderIndex: 'asc' },
  });
  const index = weeks.findIndex((w) => w.id === input.weekId);
  const swapWith = input.direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= weeks.length) return;

  const orderedWeekIds = weeks.map((w) => w.id);
  [orderedWeekIds[index], orderedWeekIds[swapWith]] = [
    orderedWeekIds[swapWith],
    orderedWeekIds[index],
  ];

  await reorderWeeks({ courseVersionId: input.courseVersionId, organizationId, orderedWeekIds });
  revalidatePath(`/admin/programs/${input.programId}/builder`);
}

export async function moveModuleAction(input: {
  weekId: string;
  moduleId: string;
  direction: 'up' | 'down';
  programId: string;
}): Promise<void> {
  const { organizationId } = await requireAdminContext();
  const modules = await prisma.module.findMany({
    where: { weekId: input.weekId },
    orderBy: { orderIndex: 'asc' },
  });
  const index = modules.findIndex((m) => m.id === input.moduleId);
  const swapWith = input.direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= modules.length) return;

  const orderedModuleIds = modules.map((m) => m.id);
  [orderedModuleIds[index], orderedModuleIds[swapWith]] = [
    orderedModuleIds[swapWith],
    orderedModuleIds[index],
  ];

  await reorderModules({ weekId: input.weekId, organizationId, orderedModuleIds });
  revalidatePath(`/admin/programs/${input.programId}/builder`);
}

export async function addModuleAction(input: {
  weekId: string;
  type: 'RECORDING' | 'READING' | 'QUIZ' | 'ASSIGNMENT';
  programId: string;
}): Promise<void> {
  const { organizationId } = await requireAdminContext();

  const defaults = {
    RECORDING: { type: 'RECORDING' as const, driveFileId: '' },
    READING: { type: 'READING' as const, contentUrl: '' },
    QUIZ: { type: 'QUIZ' as const, title: 'New quiz' },
    ASSIGNMENT: {
      type: 'ASSIGNMENT' as const,
      prompt: '',
      softDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  }[input.type];

  const titleByType = {
    RECORDING: 'Recording',
    READING: 'Reading',
    QUIZ: 'New quiz',
    ASSIGNMENT: 'Assignment',
  };

  const { moduleId } = await upsertModule({
    weekId: input.weekId,
    organizationId,
    title: titleByType[input.type],
    isPublished: false,
    fields: defaults,
  });

  revalidatePath(`/admin/programs/${input.programId}/builder`);
  redirect(`/admin/programs/${input.programId}/builder?week=${input.weekId}&module=${moduleId}`);
}

export async function toggleModulePublishAction(
  moduleId: string,
  programId: string,
): Promise<void> {
  const { organizationId } = await requireAdminContext();
  await toggleModulePublish(moduleId, organizationId);
  revalidatePath(`/admin/programs/${programId}/builder`);
}

export async function deleteModuleAction(input: {
  moduleId: string;
  weekId: string;
  programId: string;
}): Promise<void> {
  const { organizationId } = await requireAdminContext();
  await deleteModule(input.moduleId, organizationId);
  revalidatePath(`/admin/programs/${input.programId}/builder`);
  redirect(`/admin/programs/${input.programId}/builder?week=${input.weekId}`);
}

export async function saveModuleAction(
  _prevState: ModuleFormState,
  formData: FormData,
): Promise<ModuleFormState> {
  const { organizationId } = await requireAdminContext();

  const moduleId = String(formData.get('moduleId'));
  const weekId = String(formData.get('weekId'));
  const programId = String(formData.get('programId'));
  const type = String(formData.get('type'));
  const title = String(formData.get('title') ?? '').trim();
  const isPublished = formData.get('isPublished') === 'on';

  if (!title) return { error: 'Give the module a title.' };

  try {
    if (type === 'RECORDING') {
      const unlockMinutesRaw = formData.get('unlockMinutesOverride');
      await upsertModule({
        moduleId,
        weekId,
        organizationId,
        title,
        isPublished,
        fields: {
          type: 'RECORDING',
          driveFileId: String(formData.get('driveFileId') ?? ''),
          unlockMinutesOverride: unlockMinutesRaw ? Number(unlockMinutesRaw) : null,
        },
      });
    } else if (type === 'READING') {
      await upsertModule({
        moduleId,
        weekId,
        organizationId,
        title,
        isPublished,
        fields: { type: 'READING', contentUrl: String(formData.get('contentUrl') ?? '') },
      });
    } else if (type === 'ASSIGNMENT') {
      const softDeadlineRaw = String(formData.get('softDeadline') ?? '');
      const softDeadline = softDeadlineRaw ? new Date(softDeadlineRaw) : new Date();
      await upsertModule({
        moduleId,
        weekId,
        organizationId,
        title,
        isPublished,
        fields: { type: 'ASSIGNMENT', prompt: String(formData.get('prompt') ?? ''), softDeadline },
      });
    } else if (type === 'QUIZ') {
      await upsertModule({
        moduleId,
        weekId,
        organizationId,
        title,
        isPublished,
        fields: { type: 'QUIZ', title },
      });
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save this module.' };
  }

  revalidatePath(`/admin/programs/${programId}/builder`);
  return undefined;
}

export async function saveQuizQuestionsAction(input: {
  quizModuleId: string;
  programId: string;
  questionsJson: string;
}): Promise<{ error?: string }> {
  const { organizationId } = await requireAdminContext();

  let questions: Array<{ prompt: string; options: Array<{ label: string; isCorrect: boolean }> }>;
  try {
    questions = JSON.parse(input.questionsJson);
  } catch {
    return { error: 'Could not read the quiz questions — try again.' };
  }

  try {
    await replaceQuizQuestions({ quizModuleId: input.quizModuleId, organizationId, questions });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the quiz questions.' };
  }

  revalidatePath(`/admin/programs/${input.programId}/builder`);
  return {};
}
