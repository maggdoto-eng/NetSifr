import Link from 'next/link';
import { getDefaultOrganization } from '@/lib/org';
import { requireAdminContext } from '@/app/admin/action-context';
import { getVolunteerOpportunitiesForOrg } from '@/modules/volunteering';
import { AdminTopbar } from '../admin-topbar';
import { NewOpportunityForm } from './new-opportunity-form';

const STATUS_PILL: Record<string, string> = {
  DRAFT: 'pill pill--draft',
  OPEN: 'pill pill--live',
  CLOSED: 'pill pill--late',
  ARCHIVED: 'pill pill--archived',
};

export default async function VolunteeringPage() {
  await requireAdminContext();
  const org = await getDefaultOrganization();
  const opportunities = await getVolunteerOpportunitiesForOrg(org.id);

  return (
    <>
      <AdminTopbar
        trail={[{ label: 'Volunteering' }]}
        actions={
          <Link href="/admin/volunteering/service-logs" className="btn btn--ghost btn--sm">
            Verify hours
          </Link>
        }
      />
      <div className="a-main stack">
        <div>
          <h1 className="display-lg">Volunteering</h1>
          <p className="lede" style={{ marginTop: 8 }}>
            Self-service volunteer calls — applications, shifts and service-hour verification.
          </p>
        </div>

        <NewOpportunityForm />

        {opportunities.length === 0 ? (
          <div className="empty">No volunteer opportunities yet — create one above.</div>
        ) : (
          <div className="stack">
            {opportunities.map((o) => (
              <Link key={o.id} href={`/admin/volunteering/${o.id}`} className="card card--pick row row--between">
                <div className="grow">
                  <div className="title">{o.title}</div>
                  <div className="mono" style={{ marginTop: 4 }}>
                    {o._count.applications} applications · {o._count.shifts} shifts
                  </div>
                </div>
                <span className={STATUS_PILL[o.status]}>{o.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
