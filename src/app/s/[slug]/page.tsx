import { getPublishedSurveyBySlug } from '@/modules/surveys';
import type { SurveyContent } from '@/lib/survey-schema';
import { SurveyRunner } from '@/components/survey-runner';
import { submitResponseAction } from './actions';

export const metadata = { title: 'Survey · NetSifr' };

export default async function PublicSurveyPage({ params }: PageProps<'/s/[slug]'>) {
  const { slug } = await params;
  const survey = await getPublishedSurveyBySlug(slug);

  if (!survey) {
    return (
      <div className="srv-wrap">
        <div className="srv-card">
          <div className="srv-body stack" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: 40 }}>🔒</div>
            <h1 className="display-sm">This survey isn’t available</h1>
            <p className="muted">The link may be wrong, or the survey isn’t accepting responses right now.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SurveyRunner
      title={survey.title}
      content={survey.content as unknown as SurveyContent}
      submit={submitResponseAction.bind(null, survey.id)}
    />
  );
}
