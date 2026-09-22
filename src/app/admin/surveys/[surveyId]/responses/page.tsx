import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminContext } from '@/app/admin/action-context';
import { getSurveyForAdmin, getResponsesPage, SurveyError } from '@/modules/surveys';
import type { SurveyContent, Answers, Question } from '@/lib/survey-schema';

const DISPLAY = 'var(--font-display,Poppins),sans-serif';
const MONO = 'var(--font-mono,monospace)';

function fmt(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—';
  return Array.isArray(v) ? v.join(' · ') : String(v);
}

export default async function SurveyResponsesPage({
  params,
  searchParams,
}: PageProps<'/admin/surveys/[surveyId]/responses'>) {
  const { surveyId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(typeof sp.page === 'string' ? sp.page : '1', 10) || 1);
  const { organizationId } = await requireAdminContext();

  let survey;
  try {
    survey = await getSurveyForAdmin(surveyId, organizationId);
  } catch (e) {
    if (e instanceof SurveyError) notFound();
    throw e;
  }
  const content = survey.content as unknown as SurveyContent;
  const questions: Question[] = [];
  content.sections.forEach((s) => s.questions.forEach((q) => questions.push(q)));

  const { responses, total, pageSize } = await getResponsesPage(surveyId, organizationId, page);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '12px clamp(16px,4vw,36px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/admin/surveys" style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>NetSifr</Link>
            <span style={{ fontFamily: DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-muted)', paddingLeft: 12, borderLeft: '1px solid var(--border)' }}>Survey Admin</span>
          </div>
          <Link href={`/admin/surveys/${surveyId}/results`} className="ns-btn ns-btn--ghost ns-btn--sm">← Results</Link>
        </div>
      </header>

      <main style={{ flex: 1, width: '100%', maxWidth: 1000, margin: '0 auto', padding: 'clamp(22px,4vw,40px) clamp(16px,4vw,36px)' }}>
        <div className="ns-eyebrow" style={{ marginBottom: 8 }}>Individual responses</div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(24px,3.6vw,32px)', letterSpacing: '-.02em', color: 'var(--ink)' }}>{survey.title}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>{total.toLocaleString()} responses · page {page} of {pages}</p>

        {responses.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed var(--border-strong)', borderRadius: 16, padding: 48, textAlign: 'center', color: 'var(--text-muted)', marginTop: 20 }}>No responses on this page.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
            {responses.map((r) => {
              const answers = r.answers as Answers;
              const answered = Object.values(answers).filter((v) => v !== '' && v != null && !(Array.isArray(v) && v.length === 0)).length;
              return (
                <details key={r.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: '16px 20px' }}>
                  <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.submittedAt).toLocaleString()}</span>
                    <span style={{ fontFamily: DISPLAY, fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, background: r.complete ? 'var(--green-100)' : 'var(--slate-100)', color: r.complete ? 'var(--brand-hover)' : 'var(--text-muted)' }}>{r.complete ? 'Complete' : 'Partial'}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 'auto' }}>{answered} answered</span>
                  </summary>
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {questions.map((q) => (
                      <div key={q.id}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                          {q.ref && <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--brand-strong)' }}>{q.ref}</span>}
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{q.title}</span>
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-body)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{fmt(answers[q.id])}</div>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          {page > 1 ? <Link href={`/admin/surveys/${surveyId}/responses?page=${page - 1}`} className="ns-btn ns-btn--outline ns-btn--sm">← Newer</Link> : <span />}
          {page < pages ? <Link href={`/admin/surveys/${surveyId}/responses?page=${page + 1}`} className="ns-btn ns-btn--outline ns-btn--sm">Older →</Link> : <span />}
        </div>
      </main>
    </>
  );
}
