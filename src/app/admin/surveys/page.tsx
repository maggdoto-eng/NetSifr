import { prisma } from '@/lib/prisma';
import { requireAdminContext } from '@/app/admin/action-context';
import { listSurveys } from '@/modules/surveys';
import { countQuestions, type SurveyContent } from '@/lib/survey-schema';
import { SurveysDashboard } from './surveys-dashboard';

export default async function SurveysPage() {
  const { organizationId } = await requireAdminContext();
  const surveys = await listSurveys(organizationId);
  const completeCounts = await prisma.surveyResponse.groupBy({
    by: ['surveyId'],
    where: { complete: true, survey: { organizationId } },
    _count: { _all: true },
  });
  const completeMap = new Map(completeCounts.map((c) => [c.surveyId, c._count._all]));

  const rows = surveys.map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    status: s.status,
    questionCount: countQuestions(s.content as unknown as SurveyContent),
    responseCount: s._count.responses,
    completeCount: completeMap.get(s.id) ?? 0,
  }));

  return <SurveysDashboard rows={rows} />;
}
