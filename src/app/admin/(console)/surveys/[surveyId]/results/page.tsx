import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminContext } from '@/app/admin/action-context';
import { getSurveyForAdmin, getResponses, SurveyError } from '@/modules/surveys';
import { aggregate, type SurveyContent, type SurveyResponseLite } from '@/lib/survey-schema';
import { AdminTopbar } from '../../../admin-topbar';

function Bars({ dist }: { dist: { label: string; count: number; pct: number }[] }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      {dist.map((d, i) => (
        <div key={i} className="row" style={{ gap: 'var(--s3)' }}>
          <span style={{ width: 160, flex: 'none', fontSize: 14 }} className="truncate">
            {d.label}
          </span>
          <div className="bar grow">
            <i style={{ width: `${d.pct}%` }} />
          </div>
          <span className="figure" style={{ width: 84, textAlign: 'right', fontSize: 13 }}>
            {d.pct}% · {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function SurveyResultsPage({
  params,
}: PageProps<'/admin/surveys/[surveyId]/results'>) {
  const { surveyId } = await params;
  const { organizationId } = await requireAdminContext();

  let survey;
  try {
    survey = await getSurveyForAdmin(surveyId, organizationId);
  } catch (e) {
    if (e instanceof SurveyError) notFound();
    throw e;
  }
  const content = survey.content as unknown as SurveyContent;
  const responses = (await getResponses(surveyId, organizationId)).map((r) => ({
    submittedAt: r.submittedAt,
    complete: r.complete,
    answers: r.answers as SurveyResponseLite['answers'],
  }));
  const agg = aggregate(content, responses);

  return (
    <>
      <AdminTopbar
        trail={[
          { label: 'Surveys', href: '/admin/surveys' },
          { label: survey.title },
        ]}
        actions={
          <>
            <Link href={`/admin/surveys/${surveyId}/builder`} className="btn btn--ghost btn--sm">
              Edit
            </Link>
            <a href={`/admin/surveys/${surveyId}/results/export`} className="btn btn--primary btn--sm">
              Export CSV
            </a>
          </>
        }
      />
      <div className="a-main stack">
        <div>
          <h1 className="display-lg">Results</h1>
          <p className="lede" style={{ marginTop: 8 }}>
            {survey.title}
            {survey.status === 'PUBLISHED' && (
              <>
                {' '}
                · public link <code>/s/{survey.slug}</code>
              </>
            )}
          </p>
        </div>

        <div className="a-stats">
          <div className="a-stat a-stat--dark">
            <div className="a-stat__value">{agg.total}</div>
            <div className="mono" style={{ marginTop: 6 }}>
              Responses
            </div>
          </div>
          <div className="a-stat">
            <div className="a-stat__value">{agg.completed}</div>
            <div className="mono" style={{ marginTop: 6 }}>
              Completed
            </div>
          </div>
          <div className="a-stat">
            <div className="a-stat__value">{agg.completionRate}%</div>
            <div className="mono" style={{ marginTop: 6 }}>
              Completion rate
            </div>
          </div>
        </div>

        {agg.total === 0 ? (
          <div className="empty">No responses yet. Share the public link to start collecting.</div>
        ) : (
          <div className="stack">
            {agg.questions.map((q) => (
              <div key={q.id} className="card stack" style={{ gap: 'var(--s3)' }}>
                <div>
                  <div className="mono">
                    {q.ref ? `${q.ref} · ` : ''}
                    {q.section} · {q.answered} answered ({q.answerRate}%)
                  </div>
                  <div className="title" style={{ marginTop: 4 }}>
                    {q.title}
                  </div>
                </div>

                {(q.average !== undefined) && (
                  <div className="figure" style={{ fontSize: 22, color: 'var(--coral)' }}>
                    {q.average.toFixed(2)}{' '}
                    <span className="mono" style={{ color: 'var(--mute)' }}>
                      avg ({q.scaleMin}–{q.scaleMax})
                    </span>
                  </div>
                )}
                {q.distribution && <Bars dist={q.distribution} />}
                {q.ranking && (
                  <div className="stack" style={{ gap: 6 }}>
                    {q.ranking.map((r, i) => (
                      <div key={i} className="row row--between">
                        <span>
                          {i + 1}. {r.label}
                        </span>
                        <span className="figure" style={{ fontSize: 13 }}>
                          avg rank {r.avgRank.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {q.textResponses && (
                  <div className="stack" style={{ gap: 6, maxHeight: 300, overflow: 'auto' }}>
                    {q.textResponses.slice(0, 100).map((t, i) => (
                      <div key={i} className="card card--sunk" style={{ padding: '8px 12px', fontSize: 14 }}>
                        {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
