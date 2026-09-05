import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertWeekInOrg, assertModuleInOrg } from '@/modules/organizations';
import { assertCourseVersionEditable, getCourseVersionIdForModule } from './course-version';

type ModuleFields =
  | { type: 'RECORDING'; driveFileId: string; unlockMinutesOverride?: number | null }
  | { type: 'READING'; contentUrl: string; estimatedMinutes?: number | null }
  | { type: 'ASSIGNMENT'; prompt: string; softDeadline: Date }
  | { type: 'QUIZ'; title: string };

export class ModuleTypeChangeError extends Error {
  constructor() {
    super(
      "A module's type cannot be changed after creation — delete it and add a new one instead.",
    );
  }
}

/**
 * Create (omit moduleId) or update a module, writing its 1:1 side-table row
 * in the same transaction so "exactly one matching side-table row per
 * Module" holds even though the schema can't enforce it declaratively (see
 * schema.prisma's Module doc comment).
 */
export async function upsertModule(input: {
  moduleId?: string;
  weekId: string;
  organizationId: string;
  title: string;
  isPublished: boolean;
  fields: ModuleFields;
}): Promise<{ moduleId: string }> {
  await assertWeekInOrg(input.weekId, input.organizationId);
  const week = await prisma.week.findUniqueOrThrow({
    where: { id: input.weekId },
    select: { courseVersionId: true },
  });
  await assertCourseVersionEditable(week.courseVersionId);

  return prisma.$transaction(async (tx) => {
    let moduleId = input.moduleId;

    if (moduleId) {
      const existing = await tx.module.findUniqueOrThrow({ where: { id: moduleId } });
      if (existing.type !== input.fields.type) {
        throw new ModuleTypeChangeError();
      }
      await tx.module.update({
        where: { id: moduleId },
        data: { title: input.title, isPublished: input.isPublished },
      });
    } else {
      const last = await tx.module.findFirst({
        where: { weekId: input.weekId },
        orderBy: { orderIndex: 'desc' },
      });
      const created = await tx.module.create({
        data: {
          weekId: input.weekId,
          type: input.fields.type,
          title: input.title,
          isPublished: input.isPublished,
          orderIndex: last ? last.orderIndex + 1 : 0,
        },
      });
      moduleId = created.id;
    }

    switch (input.fields.type) {
      case 'RECORDING':
        await tx.recordingModule.upsert({
          where: { moduleId },
          create: {
            moduleId,
            driveFileId: input.fields.driveFileId,
            unlockMinutesOverride: input.fields.unlockMinutesOverride ?? null,
          },
          update: {
            driveFileId: input.fields.driveFileId,
            unlockMinutesOverride: input.fields.unlockMinutesOverride ?? null,
          },
        });
        break;
      case 'READING':
        await tx.readingModule.upsert({
          where: { moduleId },
          create: {
            moduleId,
            contentUrl: input.fields.contentUrl,
            estimatedMinutes: input.fields.estimatedMinutes ?? null,
          },
          update: {
            contentUrl: input.fields.contentUrl,
            estimatedMinutes: input.fields.estimatedMinutes ?? null,
          },
        });
        break;
      case 'ASSIGNMENT':
        await tx.assignmentModule.upsert({
          where: { moduleId },
          create: {
            moduleId,
            prompt: input.fields.prompt,
            softDeadline: input.fields.softDeadline,
          },
          update: { prompt: input.fields.prompt, softDeadline: input.fields.softDeadline },
        });
        break;
      case 'QUIZ':
        await tx.quizModule.upsert({
          where: { moduleId },
          create: { moduleId, title: input.fields.title },
          update: { title: input.fields.title },
        });
        break;
    }

    return { moduleId };
  });
}

export async function deleteModule(moduleId: string, organizationId: string): Promise<void> {
  await assertModuleInOrg(moduleId, organizationId);
  const courseVersionId = await getCourseVersionIdForModule(moduleId);
  await assertCourseVersionEditable(courseVersionId);
  await prisma.module.delete({ where: { id: moduleId } });
}

/**
 * Deliberately NOT guarded by assertCourseVersionEditable — publishing is an
 * operational toggle on a live cohort (the prototype explicitly allows
 * unpublishing a module mid-cohort), not a content edit.
 */
export async function toggleModulePublish(moduleId: string, organizationId: string): Promise<void> {
  await assertModuleInOrg(moduleId, organizationId);
  const existing = await prisma.module.findUniqueOrThrow({ where: { id: moduleId } });
  await prisma.module.update({
    where: { id: moduleId },
    data: { isPublished: !existing.isPublished },
  });
}

export async function reorderModules(input: {
  weekId: string;
  organizationId: string;
  orderedModuleIds: string[];
}): Promise<void> {
  await assertWeekInOrg(input.weekId, input.organizationId);
  const week = await prisma.week.findUniqueOrThrow({
    where: { id: input.weekId },
    select: { courseVersionId: true },
  });
  await assertCourseVersionEditable(week.courseVersionId);

  const OFFSET = 100_000;
  await prisma.$transaction([
    ...input.orderedModuleIds.map((moduleId, index) =>
      prisma.module.update({ where: { id: moduleId }, data: { orderIndex: OFFSET + index } }),
    ),
    ...input.orderedModuleIds.map((moduleId, index) =>
      prisma.module.update({ where: { id: moduleId }, data: { orderIndex: index } }),
    ),
  ]);
}

/**
 * Full replace-on-save for a quiz's question/option tree — safe because
 * assertCourseVersionEditable guarantees no QuizAttempt/QuizAnswer exists
 * yet for this quiz (attempts only happen once a cohort is LIVE, by which
 * point the version is locked and this function would refuse to run).
 */
export async function replaceQuizQuestions(input: {
  quizModuleId: string;
  organizationId: string;
  questions: Array<{ prompt: string; options: Array<{ label: string; isCorrect: boolean }> }>;
}): Promise<void> {
  await assertModuleInOrg(input.quizModuleId, input.organizationId);
  const courseVersionId = await getCourseVersionIdForModule(input.quizModuleId);
  await assertCourseVersionEditable(courseVersionId);

  await prisma.$transaction(async (tx) => {
    await tx.quizQuestion.deleteMany({ where: { quizModuleId: input.quizModuleId } });

    for (let qi = 0; qi < input.questions.length; qi++) {
      const q = input.questions[qi];
      const question = await tx.quizQuestion.create({
        data: { quizModuleId: input.quizModuleId, orderIndex: qi, prompt: q.prompt },
      });
      for (let oi = 0; oi < q.options.length; oi++) {
        const o = q.options[oi];
        await tx.quizOption.create({
          data: { questionId: question.id, orderIndex: oi, label: o.label, isCorrect: o.isCorrect },
        });
      }
    }
  });
}
