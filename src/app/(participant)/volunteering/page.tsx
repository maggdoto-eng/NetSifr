import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getMyVolunteering } from '@/modules/volunteering';

const STATUS_PILL: Record<string, string> = {
  APPLIED: 'pill pill--live',
  SHORTLISTED: 'pill pill--live',
  ACCEPTED: 'pill pill--done',
  REJECTED: 'pill pill--archived',
  WITHDRAWN: 'pill pill--archived',
};

const STATUS_LABEL: Record<string, string> = {
  APPLIED: 'Applied',
  SHORTLISTED: 'Shortlisted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Not selected',
  WITHDRAWN: 'Withdrawn',
};

export default async function MyVolunteeringPage() {
  const { userId } = await verifySession();
  const items = await getMyVolunteering(userId);

  return (
    <div className="shell stack">
      <div>
        <div className="mono">Act</div>
        <h1 className="display-lg" style={{ marginTop: 6 }}>
          My volunteering
        </h1>
        <p className="lede" style={{ marginTop: 8 }}>
          Opportunities you’ve applied to.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          Nothing yet — browse <Link href="/discover">Discover</Link> to find a volunteer call.
        </div>
      ) : (
        <div className="grid-3">
          {items.map((v) => (
            <Link
              key={v.applicationId}
              href={
                v.status === 'ACCEPTED'
                  ? `/volunteering/${v.volunteerOpportunityId}`
                  : `/discover/volunteering/${v.volunteerOpportunityId}`
              }
              className="card card--pick row row--between"
            >
              <div className="grow">
                <div className="title">{v.title}</div>
                <div className="mono" style={{ marginTop: 4 }}>
                  Applied {v.appliedAt.toLocaleDateString()}
                </div>
              </div>
              <span className={STATUS_PILL[v.status]}>{STATUS_LABEL[v.status]}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
