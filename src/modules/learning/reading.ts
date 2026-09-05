import 'server-only';
import { prisma } from '@/lib/prisma';
import {
  lockCourseVersionOnFirstActivity,
  getCourseVersionIdForModule,
  resolveUserCohortContext,
} from './course-version';
import { awardReadingCompleted } from '@/modules/recognition';

export async function markReadingDone(userId: string, readingModuleId: string): Promise<void> {
  await prisma.readingProgress.upsert({
    where: { userId_readingModuleId: { userId, readingModuleId } },
    create: { userId, readingModuleId },
    update: {},
  });

  const courseVersionId = await getCourseVersionIdForModule(readingModuleId);
  await lockCourseVersionOnFirstActivity(courseVersionId);

  const cohortContext = await resolveUserCohortContext(userId, courseVersionId);
  if (cohortContext) {
    await awardReadingCompleted({ userId, ...cohortContext, readingModuleId });
  }
}
