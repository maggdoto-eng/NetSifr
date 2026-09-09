import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCohortRoster, getSubmissionsForCohort } from '@/modules/learning';
import { requireAdminContext } from '@/app/admin/action-context';
import { AdminTopbar } from '../../../admin-topbar';
import { overrideAttendanceAction } from './actions';

const STATUS_ORDER_PILL: Record<string, string> = {
  DRAFT: 'pill pill--draft',
  LIVE: 'pill pill--live',
  ARCHIVED: 'pill pill--archived',
};

export default async function AttendancePage({
  params,
}: PageProps<'/admin/programs/[programId]/attendance'>) {
  const { programId } = await params;
  const { organizationId } = await requireAdminContext();

  const cohort = await prisma.cohort.findFirst({
    where: { id: programId, organizationId },
    include: { opportunity: { select: { title: true } } },
  });
  if (!cohort) notFound();

  const [{ recordings, rows }, submissions] = await Promise.all([
    getCohortRoster(programId, organizationId),
    getSubmissionsForCohort(programId, organizationId),
  ]);

  const enrolled = rows.length;
  const avgAttendance =
    enrolled === 0 ? 0 : Math.round(rows.reduce((s, r) => s + r.attendancePercent, 0) / enrolled);
  const atRisk = rows.filter((r) => r.attendancePercent < 50).length;
  const toGrade = submissions.filter((s) => !s.grade).length;

  const gridCols = '2.2fr 1fr 1.6fr 1fr';

  return (
    <>
      <AdminTopbar
        trail={[
          { label: 'Programs', href: '/admin/programs' },
          {
            label: `${cohort.cohortLabel} — ${cohort.opportunity.title}`,
            pill: <span className={STATUS_ORDER_PILL[cohort.status]}>{cohort.status}</span>,
          },
        ]}
        actions={
          <Link
            href={`/admin/programs/${programId}/attendance/export`}
            className="btn btn--accent btn--sm"
          >
            Export CSV for partners
          </Link>
        }
      />
      <div className="a-main stack">
        <div className="a-stats">
          <div className="a-stat">
            <div className="a-stat__value">{enrolled}</div>
            <div className="mono" style={{ marginTop: 6 }}>
              Enrolled
            </div>
          </div>
          <div className="a-stat a-stat--dark">
            <div className="a-stat__value">{enrolled === 0 ? '—' : `${avgAttendance}%`}</div>
            <div className="mono" style={{ marginTop: 6 }}>
              Avg attendance
            </div>
          </div>
          <div className="a-stat">
            <div className="a-stat__value">{toGrade}</div>
            <div className="mono" style={{ marginTop: 6 }}>
              To grade
            </div>
          </div>
          <div className={`a-stat ${atRisk > 0 ? 'a-stat--alert' : ''}`}>
            <div className="a-stat__value">{atRisk}</div>
            <div className="mono" style={{ marginTop: 6 }}>
              At risk · missed half
            </div>
          </div>
        </div>

        {recordings.length === 0 ? (
          <div className="empty">No recordings published yet.</div>
        ) : rows.length === 0 ? (
          <div className="empty">Nobody enrolled yet.</div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <div style={{ minWidth: 640 }}>
              <div
                className="table__head"
                style={{ gridTemplateColumns: gridCols, borderBottom: '2px solid var(--ink)' }}
              >
                <span className="mono">Participant</span>
                <span className="mono">Attend</span>
                <span className="mono">Weeks 1–{recordings.length}</span>
                <span className="mono">Status</span>
              </div>
              {rows.map((row) => (
                <div
                  key={row.enrolmentId}
                  className="table__row"
                  style={{ gridTemplateColumns: gridCols }}
                >
                  <span style={{ fontWeight: 600 }} className="truncate">
                    {row.name}
                  </span>
                  <span className="figure">{row.attendancePercent}%</span>
                  <span className="heat">
                    {row.recordings.map((r) =>
                      r.confirmedAt ? (
                        <i
                          key={r.moduleId}
                          className="on"
                          title={`${Math.round(r.engagedSeconds / 60)} min engaged`}
                        />
                      ) : (
                        <form
                          key={r.moduleId}
                          action={overrideAttendanceAction.bind(null, {
                            cohortId: programId,
                            userId: row.userId,
                            recordingModuleId: r.moduleId,
                          })}
                          style={{ display: 'inline-flex' }}
                        >
                          <button
                            type="submit"
                            title="Mark attended (admin override)"
                            aria-label="Mark attended"
                            className="heat"
                            style={{ padding: 0, border: 0, background: 'none' }}
                          >
                            <i className="miss" />
                          </button>
                        </form>
                      ),
                    )}
                  </span>
                  <span className="mono">{row.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
