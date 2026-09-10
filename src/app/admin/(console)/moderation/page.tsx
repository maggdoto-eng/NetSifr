import { requireAdminContext } from '@/app/admin/action-context';
import { getOpenReports } from '@/modules/community';
import { AdminTopbar } from '../admin-topbar';
import { hideReportAction, dismissReportAction } from './actions';

export default async function ModerationPage() {
  const { organizationId } = await requireAdminContext();
  const reports = await getOpenReports(organizationId);

  return (
    <>
      <AdminTopbar trail={[{ label: 'Moderation' }]} />
      <div className="a-main stack">
        <div>
          <h1 className="display-lg">Moderation</h1>
          <p className="lede" style={{ marginTop: 8 }}>
            Posts participants have reported. Hide removes the post from every feed; dismiss clears
            the report.
          </p>
        </div>

        {reports.length === 0 ? (
          <div className="empty">Nothing reported — the community is behaving.</div>
        ) : (
          <div className="stack">
            {reports.map((r) => (
              <div key={r.id} className="card stack" style={{ gap: 'var(--s3)' }}>
                <div className="row row--between wrap">
                  <div className="mono mono--coral">Reported · {r.createdAt.toLocaleDateString()}</div>
                  <div className="mono">
                    {r.post.cohort
                      ? `${r.post.cohort.cohortLabel} — ${r.post.cohort.opportunity.title}`
                      : 'Community'}
                  </div>
                </div>
                <div className="card card--sunk" style={{ padding: 'var(--s4)' }}>
                  <div className="mono" style={{ marginBottom: 4 }}>
                    {r.post.author.name}
                    {r.post.hiddenAt && ' · already hidden'}
                  </div>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.post.body}</p>
                </div>
                <div className="muted" style={{ fontSize: 14 }}>
                  <strong>{r.reporter.name}</strong> reported: {r.reason}
                </div>
                <div className="row" style={{ gap: 'var(--s2)' }}>
                  <form action={hideReportAction.bind(null, r.id)}>
                    <button type="submit" className="btn btn--accent btn--sm">
                      Hide post
                    </button>
                  </form>
                  <form action={dismissReportAction.bind(null, r.id)}>
                    <button type="submit" className="btn btn--ghost btn--sm">
                      Dismiss
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
