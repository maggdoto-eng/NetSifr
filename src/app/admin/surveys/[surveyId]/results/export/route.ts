import { requireAdminContext } from '@/app/admin/action-context';
import { getSurveyForAdmin, getResponses } from '@/modules/surveys';
import { toCsv } from '@/lib/csv';
import { slugify } from '@/lib/slug';
import { OTHER_VALUE, otherKey, type SurveyContent, type Question, type Answers } from '@/lib/survey-schema';

export async function GET(req: Request, { params }: RouteContext<'/admin/surveys/[surveyId]/results/export'>) {
  const { surveyId } = await params;
  const { organizationId } = await requireAdminContext();

  // PII (contact) columns are excluded by default; ?pii=1 opts into a full export.
  const includePII = new URL(req.url).searchParams.get('pii') === '1';

  const survey = await getSurveyForAdmin(surveyId, organizationId);
  const content = survey.content as unknown as SurveyContent;
  const responses = await getResponses(surveyId, organizationId);

  const questions: Question[] = [];
  content.sections.forEach((s) => s.questions.forEach((q) => { if (includePII || !q.pii) questions.push(q); }));

  const label = (v: string, all: Answers, q: Question): string =>
    v === OTHER_VALUE ? String(all[otherKey(q.id)] ?? 'Other') : v;

  const headers = ['Submitted at', 'Complete', ...questions.map((q) => `${q.ref ? q.ref + ' — ' : ''}${q.title}${q.pii ? ' [PII]' : ''}`)];
  const rows = responses.map((r) => {
    // Merge contact back in only for the opt-in full export.
    const all: Answers = { ...(r.answers as Answers), ...(includePII ? ((r.contact as Answers) ?? {}) : {}) };
    return [
      new Date(r.submittedAt).toISOString(),
      r.complete ? 'yes' : 'no',
      ...questions.map((q) => {
        const v = all[q.id];
        if (v === undefined || v === null) return '';
        return Array.isArray(v) ? v.map((x) => label(x, all, q)).join('; ') : label(String(v), all, q);
      }),
    ];
  });

  const csv = toCsv(headers, rows);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="survey-${slugify(survey.title)}-responses${includePII ? '-full' : ''}.csv"`,
    },
  });
}
