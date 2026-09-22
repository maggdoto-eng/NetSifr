import { requireAdminContext } from '@/app/admin/action-context';
import { getSurveyForAdmin, getResponses } from '@/modules/surveys';
import { toCsv } from '@/lib/csv';
import { slugify } from '@/lib/slug';
import type { SurveyContent, Question, Answers } from '@/lib/survey-schema';

export async function GET(_req: Request, { params }: RouteContext<'/admin/surveys/[surveyId]/results/export'>) {
  const { surveyId } = await params;
  const { organizationId } = await requireAdminContext();

  const survey = await getSurveyForAdmin(surveyId, organizationId);
  const content = survey.content as unknown as SurveyContent;
  const responses = await getResponses(surveyId, organizationId);

  const questions: Question[] = [];
  content.sections.forEach((s) => s.questions.forEach((q) => questions.push(q)));

  const headers = ['Submitted at', 'Complete', ...questions.map((q) => `${q.ref ? q.ref + ' — ' : ''}${q.title}`)];
  const rows = responses.map((r) => {
    const answers = r.answers as Answers;
    return [
      new Date(r.submittedAt).toISOString(),
      r.complete ? 'yes' : 'no',
      ...questions.map((q) => {
        const v = answers[q.id];
        if (v === undefined || v === null) return '';
        return Array.isArray(v) ? v.join('; ') : String(v);
      }),
    ];
  });

  const csv = toCsv(headers, rows);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="survey-${slugify(survey.title)}-responses.csv"`,
    },
  });
}
