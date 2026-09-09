import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import {
  getEnrolmentsForUser,
  getPendingInvitationsForUser,
  computeCohortProgressPercent,
  computeUserAttendancePercent,
} from '@/modules/learning';
import { getCohortPoints } from '@/modules/recognition';
import { InvitationCard } from './invitation-card';
import { ProgramCard, MARK_COLORS } from './program-card';

export default async function ProgramsPage() {
  const { userId } = await verifySession();

  const [invitations, enrolments] = await Promise.all([
    getPendingInvitationsForUser(userId),
    getEnrolmentsForUser(userId),
  ]);

  const active = enrolments.filter((e) => e.status === 'ACTIVE');
  const completed = enrolments.filter((e) => e.status === 'COMPLETED');

  const buildCard = async (
    enrolment: (typeof enrolments)[number],
    i: number,
    forceComplete = false,
  ) => {
    const cohort = enrolment.cohort;
    const weekCount = cohort.courseVersion.weeks.length;
    const isDraft = cohort.status === 'DRAFT';
    const [progressPercent, points, attendancePercent, releasedWeeks] = await Promise.all([
      computeCohortProgressPercent(userId, enrolment.cohortId),
      getCohortPoints(userId, enrolment.cohortId),
      computeUserAttendancePercent(userId, enrolment.cohortId),
      isDraft
        ? Promise.resolve(0)
        : prisma.cohortSession.count({
            where: { cohortId: enrolment.cohortId, startsOn: { lte: new Date() } },
          }),
    ]);

    return {
      cohortId: enrolment.cohortId,
      title: cohort.opportunity.title,
      meta: `${cohort.cohortLabel} · ${weekCount} weeks`,
      markColor: MARK_COLORS[i % MARK_COLORS.length],
      state: (forceComplete ? 'completed' : isDraft ? 'notopen' : 'active') as
        | 'active'
        | 'completed'
        | 'notopen',
      currentWeek: releasedWeeks || undefined,
      progressPercent: forceComplete ? 100 : progressPercent,
      points,
      attendancePercent,
    };
  };

  const [activeCards, completedCards] = await Promise.all([
    Promise.all(active.map((e, i) => buildCard(e, i))),
    Promise.all(completed.map((e, i) => buildCard(e, i, true))),
  ]);

  return (
    <div className="shell stack">
      <div>
        <div className="mono">
          {enrolments.length} enrolments · {invitations.length} invitations
        </div>
        <h1 className="display-lg" style={{ marginTop: 6 }}>
          Your programs
        </h1>
        <p className="lede" style={{ marginTop: 8 }}>
          Each program keeps its own sessions, attendance and points. Your profile is shared across
          all of them.
        </p>
      </div>

      {invitations.length > 0 && (
        <div className="stack">
          <div className="mono mono--coral">Invitations · {invitations.length}</div>
          <div className="grid-3">
            {invitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitationId={invitation.id}
                title={invitation.cohort.opportunity.title}
                cohortLabel={invitation.cohort.cohortLabel}
              />
            ))}
          </div>
        </div>
      )}

      <div className="stack">
        <div className="mono">Active · {activeCards.length}</div>
        {activeCards.length > 0 ? (
          <div className="grid-3">
            {activeCards.map((card) => (
              <ProgramCard key={card.cohortId} {...card} />
            ))}
          </div>
        ) : (
          <div className="empty">
            Programs are invite-only. Your facilitator sends a link, or adds you to a cohort
            directly — it lands here.
          </div>
        )}
      </div>

      {completedCards.length > 0 && (
        <div className="stack">
          <div className="mono">Completed</div>
          <div className="grid-3">
            {completedCards.map((card) => (
              <ProgramCard key={card.cohortId} {...card} />
            ))}
          </div>
        </div>
      )}

      <div className="card card--notice">
        Programs are invite-only. A facilitator sends a link or adds you to a cohort directly — it
        arrives here.
      </div>
    </div>
  );
}
