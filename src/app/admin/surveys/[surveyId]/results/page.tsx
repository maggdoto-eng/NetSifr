import { notFound } from 'next/navigation';
import { requireAdminContext } from '@/app/admin/action-context';
import {
  getSurveyForAdmin,
  getResponses,
  countResponses,
  getAnalytics,
  SERVER_AGG_THRESHOLD,
  SurveyError,
} from '@/modules/surveys';
import type { SurveyContent, SurveyResponseLite } from '@/lib/survey-schema';
import { SurveyResults } from './survey-results';

export default async function SurveyResultsPage({ params }: PageProps<'/admin/surveys/[surveyId]/results'>) {
  const { surveyId } = await params;
  const { organizationId } = await requireAdminContext();

  let survey;
  try {
    survey = await getSurveyForAdmin(surveyId, organizationId);
  } catch (e) {
    if (e instanceof SurveyError) notFound();
    throw e;
  }

  const count = await countResponses(surveyId, organizationId);
  const common = {
    surveyId,
    title: survey.title,
    slug: survey.slug,
    status: survey.status,
    content: survey.content as unknown as SurveyContent,
    totalCount: count,
  };

  // Large surveys: aggregate on the server and drive filters via a server action
  // rather than shipping every raw response to the browser (spec P4).
  if (count > SERVER_AGG_THRESHOLD) {
    const initial = await getAnalytics(surveyId, organizationId, {});
    return <SurveyResults {...common} serverMode initialAnalytics={{ agg: initial.agg, ct: initial.ct }} />;
  }

  const responses = await getResponses(surveyId, organizationId);
  const lite: SurveyResponseLite[] = responses.map((r) => ({
    submittedAt: r.submittedAt.toISOString(),
    complete: r.complete,
    answers: r.answers as SurveyResponseLite['answers'],
  }));
  return <SurveyResults {...common} responses={lite} />;
}
