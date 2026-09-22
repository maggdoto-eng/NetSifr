import { notFound } from 'next/navigation';
import { requireAdminContext } from '@/app/admin/action-context';
import { getSurveyForAdmin, SurveyError } from '@/modules/surveys';
import type { SurveyContent } from '@/lib/survey-schema';
import { SurveyBuilder } from './survey-builder';

export default async function SurveyBuilderPage({
  params,
}: PageProps<'/admin/surveys/[surveyId]/builder'>) {
  const { surveyId } = await params;
  const { organizationId } = await requireAdminContext();

  let survey;
  try {
    survey = await getSurveyForAdmin(surveyId, organizationId);
  } catch (e) {
    if (e instanceof SurveyError) notFound();
    throw e;
  }

  return (
    <SurveyBuilder
      surveyId={survey.id}
      status={survey.status}
      initial={{
        title: survey.title,
        slug: survey.slug,
        content: survey.content as unknown as SurveyContent,
      }}
    />
  );
}
