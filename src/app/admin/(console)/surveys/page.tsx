import Link from 'next/link';
import { requireAdminContext } from '@/app/admin/action-context';
import { listSurveys } from '@/modules/surveys';
import { countQuestions, type SurveyContent } from '@/lib/survey-schema';
import { AdminTopbar } from '../admin-topbar';
import {
  createSurveyAction,
  duplicateSurveyAction,
  deleteSurveyAction,
  setSurveyStatusAction,
} from './actions';

const STATUS_PILL: Record<string, string> = {
  DRAFT: 'pill pill--draft',
  PUBLISHED: 'pill pill--live',
  CLOSED: 'pill pill--archived',
};

export default async function SurveysPage() {
  const { organizationId } = await requireAdminContext();
  const surveys = await listSurveys(organizationId);

  return (
    <>
      <AdminTopbar
        trail={[{ label: 'Surveys' }]}
        actions={
          <form action={createSurveyAction}>
            <button type="submit" className="btn btn--primary btn--sm">
              + New survey
            </button>
          </form>
        }
      />
      <div className="a-main stack">
        <div>
          <h1 className="display-lg">Surveys</h1>
          <p className="lede" style={{ marginTop: 8 }}>
            Standalone surveys. Build questions, publish, and share the public link — anyone can
            respond without an account.
          </p>
        </div>

        {surveys.length === 0 ? (
          <div className="empty">No surveys yet. Create your first one.</div>
        ) : (
          <div className="prog-grid">
            {surveys.map((s) => {
              const content = s.content as unknown as SurveyContent;
              const qCount = countQuestions(content);
              return (
                <div key={s.id} className="card stack">
                  <div className="row row--between">
                    <span className={STATUS_PILL[s.status]}>{s.status}</span>
                    <span className="mono">v{s.version}</span>
                  </div>
                  <div>
                    <div className="title">{s.title}</div>
                    <div className="mono" style={{ marginTop: 4 }}>
                      {qCount} questions · {s._count.responses} responses
                    </div>
                  </div>

                  {s.status === 'PUBLISHED' && (
                    <div className="card card--sunk" style={{ padding: '10px 12px' }}>
                      <div className="mono" style={{ marginBottom: 2 }}>
                        Public link
                      </div>
                      <div className="truncate" style={{ fontSize: 13 }}>
                        /s/{s.slug}
                      </div>
                    </div>
                  )}

                  <div className="row wrap" style={{ gap: 'var(--s2)' }}>
                    <Link href={`/admin/surveys/${s.id}/builder`} className="btn btn--primary btn--sm">
                      Edit
                    </Link>
                    <Link href={`/admin/surveys/${s.id}/results`} className="btn btn--ghost btn--sm">
                      Results
                    </Link>
                    {s.status !== 'PUBLISHED' ? (
                      <form action={setSurveyStatusAction.bind(null, s.id, 'PUBLISHED')}>
                        <button type="submit" className="btn btn--done btn--sm">
                          Publish
                        </button>
                      </form>
                    ) : (
                      <form action={setSurveyStatusAction.bind(null, s.id, 'CLOSED')}>
                        <button type="submit" className="btn btn--ghost btn--sm">
                          Close
                        </button>
                      </form>
                    )}
                    <form action={duplicateSurveyAction.bind(null, s.id)}>
                      <button type="submit" className="btn btn--ghost btn--sm">
                        Duplicate
                      </button>
                    </form>
                    <form action={deleteSurveyAction.bind(null, s.id)}>
                      <button
                        type="submit"
                        className="btn btn--ghost btn--sm"
                        style={{ color: 'var(--coral)' }}
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
