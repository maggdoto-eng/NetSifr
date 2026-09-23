import { notFound } from 'next/navigation';
import { requireAdminContext } from '@/app/admin/action-context';
import { getSurveyForAdmin, SurveyError } from '@/modules/surveys';
import type { SurveyContent } from '@/lib/survey-schema';
import { PreviewFrame } from './preview-frame';

export default async function SurveyPreviewPage({
  params,
}: PageProps<'/admin/surveys/[surveyId]/preview'>) {
  const { surveyId } = await params;
  const { organizationId } = await requireAdminContext();
  let survey;
  try {
    survey = await getSurveyForAdmin(surveyId, organizationId);
  } catch (e) {
    if (e instanceof SurveyError) notFound();
    throw e;
  }
  return <PreviewFrame title={survey.title} content={survey.content as unknown as SurveyContent} />;
}
