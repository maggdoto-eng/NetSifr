import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import {
  getEnrolmentsForUser,
  getPendingInvitationsForUser,
  computeCohortProgressPercent,
} from '@/modules/learning';
import { InvitationCard } from './invitation-card';
import { ProgramCard, MARK_COLORS } from './program-card';
import { BottomNav } from '../bottom-nav';

export default async function ProgramsPage() {
  const { userId } = await verifySession();

  const [invitations, enrolments, user] = await Promise.all([
    getPendingInvitationsForUser(userId),
    getEnrolmentsForUser(userId),
    prisma.user.findUnique({ where: { id: userId }, include: { persona: true } }),
  ]);

  const active = enrolments.filter((e) => e.status === 'ACTIVE');
  const completed = enrolments.filter((e) => e.status === 'COMPLETED');

  const activeCards = await Promise.all(
    active.map(async (enrolment, i) => ({
      cohortId: enrolment.cohortId,
      title: enrolment.cohort.opportunity.title,
      cohortLabel: enrolment.cohort.cohortLabel,
      weekCount: enrolment.cohort.courseVersion.weeks.length,
      progressPercent: await computeCohortProgressPercent(userId, enrolment.cohortId),
      markColor: MARK_COLORS[i % MARK_COLORS.length],
    })),
  );

  const glyph = user?.persona?.glyph ?? user?.name?.charAt(0)?.toUpperCase() ?? '·';

  return (
    <>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="ns-hero px-[22px] pb-6 pt-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="ns-label text-mint">
                {active.length} active · {invitations.length} invited
              </div>
              <h1 className="mt-1.5 text-[28px] leading-none text-cream">Your programs</h1>
            </div>
            <Link
              href="/me"
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[rgba(245,242,234,0.12)] text-lg text-mint"
            >
              {glyph}
            </Link>
          </div>
        </header>

        <div className="flex flex-col gap-3.5 p-[22px]">
          {invitations.length > 0 && (
            <>
              <div className="ns-label text-coral">Invitations</div>
              {invitations.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitationId={invitation.id}
                  title={invitation.cohort.opportunity.title}
                  cohortLabel={invitation.cohort.cohortLabel}
                />
              ))}
            </>
          )}

          <div className="ns-label text-[#4A6258]">Active · {active.length}</div>
          {activeCards.map((card) => (
            <ProgramCard key={card.cohortId} {...card} />
          ))}
          {activeCards.length === 0 && (
            <p className="rounded-2xl border-[1.5px] border-dashed border-[rgba(16,36,30,0.22)] p-4 text-[13px] leading-relaxed text-[#4A6258]">
              Programs are invite-only. Your facilitator sends a link, or adds you to a cohort
              directly — it lands here.
            </p>
          )}

          {completed.length > 0 && (
            <>
              <div className="ns-label mt-1.5 text-[#4A6258]">Completed</div>
              {completed.map((enrolment, i) => (
                <ProgramCard
                  key={enrolment.cohortId}
                  cohortId={enrolment.cohortId}
                  title={enrolment.cohort.opportunity.title}
                  cohortLabel={enrolment.cohort.cohortLabel}
                  weekCount={enrolment.cohort.courseVersion.weeks.length}
                  progressPercent={100}
                  markColor={MARK_COLORS[i % MARK_COLORS.length]}
                  completed
                />
              ))}
            </>
          )}
        </div>
      </div>
      <BottomNav active="/programs" />
    </>
  );
}
