'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdminContext } from '@/app/admin/action-context';
import {
  createSurvey,
  duplicateSurvey,
  deleteSurvey,
  setSurveyStatus,
  updateSurvey,
} from '@/modules/surveys';
import type { SurveyContent } from '@/lib/survey-schema';

export async function saveSurveyAction(
  id: string,
  data: { title: string; slug: string; content: SurveyContent },
): Promise<{ ok?: boolean; slug?: string; error?: string }> {
  const { organizationId } = await requireAdminContext();
  try {
    const saved = await updateSurvey({ id, organizationId, ...data });
    revalidatePath('/admin/surveys');
    return { ok: true, slug: saved.slug };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save.' };
  }
}

export async function createSurveyAction(): Promise<void> {
  const { organizationId } = await requireAdminContext();
  const survey = await createSurvey({ organizationId });
  redirect(`/admin/surveys/${survey.id}/builder`);
}

export async function duplicateSurveyAction(id: string): Promise<void> {
  const { organizationId } = await requireAdminContext();
  await duplicateSurvey(id, organizationId);
  revalidatePath('/admin/surveys');
}

export async function deleteSurveyAction(id: string): Promise<void> {
  const { organizationId } = await requireAdminContext();
  await deleteSurvey(id, organizationId);
  revalidatePath('/admin/surveys');
}

export async function setSurveyStatusAction(
  id: string,
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED',
): Promise<void> {
  const { organizationId } = await requireAdminContext();
  await setSurveyStatus({ id, organizationId, status });
  revalidatePath('/admin/surveys');
  revalidatePath(`/admin/surveys/${id}/builder`);
}
