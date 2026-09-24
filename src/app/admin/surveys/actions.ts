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
  getAnalytics,
  setRetention,
  deleteResponse,
  anonymiseResponses,
  purgeExpiredResponses,
  type AnalyticsFilters,
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
  const { organizationId, userId } = await requireAdminContext();
  const survey = await createSurvey({ organizationId, ownerUserId: userId });
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

/** Server-side aggregation for the results page filters (spec P4). */
export async function surveyAnalyticsAction(surveyId: string, filters: AnalyticsFilters) {
  const { organizationId } = await requireAdminContext();
  const { agg, ct, total } = await getAnalytics(surveyId, organizationId, filters);
  return { agg, ct, total };
}

/* ---- Data governance (spec P2) ---- */

export async function setRetentionAction(surveyId: string, retentionDays: number | null): Promise<void> {
  const { organizationId } = await requireAdminContext();
  await setRetention(surveyId, organizationId, retentionDays);
  revalidatePath(`/admin/surveys/${surveyId}/responses`);
}

export async function deleteResponseAction(surveyId: string, responseId: string): Promise<void> {
  const { organizationId } = await requireAdminContext();
  await deleteResponse(surveyId, responseId, organizationId);
  revalidatePath(`/admin/surveys/${surveyId}/responses`);
  revalidatePath(`/admin/surveys/${surveyId}/results`);
}

export async function anonymiseResponsesAction(surveyId: string): Promise<{ count: number }> {
  const { organizationId } = await requireAdminContext();
  const count = await anonymiseResponses(surveyId, organizationId);
  revalidatePath(`/admin/surveys/${surveyId}/responses`);
  return { count };
}

export async function purgeExpiredAction(surveyId?: string): Promise<{ removed: number }> {
  const { organizationId } = await requireAdminContext();
  const removed = await purgeExpiredResponses(organizationId, surveyId);
  if (surveyId) revalidatePath(`/admin/surveys/${surveyId}/responses`);
  return { removed };
}
