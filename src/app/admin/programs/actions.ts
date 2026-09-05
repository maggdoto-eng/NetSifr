'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createProgram, duplicateProgram, updateCohortStatus } from '@/modules/learning';
import { requireAdminContext } from '../action-context';
import { CreateProgramSchema } from './schemas';

export type CreateProgramState = { error?: string } | undefined;

export async function createProgramAction(
  _prevState: CreateProgramState,
  formData: FormData,
): Promise<CreateProgramState> {
  const { userId, organizationId } = await requireAdminContext();

  const parsed = CreateProgramSchema.safeParse({
    title: formData.get('title'),
    cohortLabel: formData.get('cohortLabel'),
    weekCount: formData.get('weekCount'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  const { cohortId } = await createProgram({
    organizationId,
    title: parsed.data.title,
    cohortLabel: parsed.data.cohortLabel,
    weekCount: parsed.data.weekCount,
    ownerUserId: userId,
  });

  revalidatePath('/admin/programs');
  redirect(`/admin/programs/${cohortId}/builder`);
}

export async function duplicateProgramAction(cohortId: string): Promise<void> {
  const { userId, organizationId } = await requireAdminContext();
  const source = await prisma.cohort.findUniqueOrThrow({
    where: { id: cohortId },
    select: { cohortLabel: true },
  });

  await duplicateProgram({
    cohortId,
    organizationId,
    actingUserId: userId,
    newCohortLabel: `${source.cohortLabel} (copy)`,
  });

  revalidatePath('/admin/programs');
}

export async function publishProgramAction(cohortId: string): Promise<void> {
  const { userId, organizationId } = await requireAdminContext();
  await updateCohortStatus({ cohortId, organizationId, actingUserId: userId, status: 'LIVE' });
  revalidatePath('/admin/programs');
  revalidatePath(`/admin/programs/${cohortId}/builder`);
}

export async function archiveProgramAction(cohortId: string): Promise<void> {
  const { userId, organizationId } = await requireAdminContext();
  await updateCohortStatus({ cohortId, organizationId, actingUserId: userId, status: 'ARCHIVED' });
  revalidatePath('/admin/programs');
  revalidatePath(`/admin/programs/${cohortId}/builder`);
}
