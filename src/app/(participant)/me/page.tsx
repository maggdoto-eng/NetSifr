import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { getEnrolmentsForUser, computeUserAttendancePercent } from '@/modules/learning';
import { getTotalPoints, getCohortPoints } from '@/modules/recognition';
import { avatarFor } from '@/lib/avatars';
import { logoutAction } from '@/app/(auth)/actions';
import { BottomNav } from '../bottom-nav';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Done',
  WITHDRAWN: 'Withdrawn',
};

export default async function MePage() {
  const { userId } = await verifySession();

  const [user, enrolments, topics] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { persona: true } }),
    getEnrolmentsForUser(userId),
    prisma.userTopic.findMany({ where: { userId }, include: { topic: true } }),
  ]);

  const avatar = avatarFor(user.avatarKey);
  const activeCount = enrolments.filter((e) => e.status === 'ACTIVE').length;

  const [totalPoints, enrolmentStats] = await Promise.all([
    getTotalPoints(userId),
    Promise.all(
      enrolments.map(async (enrolment) => ({
        enrolmentId: enrolment.id,
        points: await getCohortPoints(userId, enrolment.cohortId),
        attendancePercent: await computeUserAttendancePercent(userId, enrolment.cohortId),
      })),
    ),
  ]);
  const statsByEnrolmentId = new Map(enrolmentStats.map((s) => [s.enrolmentId, s]));

  return (
    <>
      <header className="ns-hero px-[22px] pb-6 pt-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-14 w-14 flex-none items-center justify-center rounded-full text-xl"
              style={{ background: avatar.bg, color: avatar.fg }}
            >
              {avatar.glyph}
            </div>
            <div>
              <div className="text-[22px] leading-tight text-cream">{user.name}</div>
              <div className="ns-label mt-1 text-mint">{user.persona?.name ?? '—'}</div>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="ns-label rounded-full bg-[rgba(245,242,234,0.12)] px-3 py-2 text-[9px] text-cream"
            >
              Log out
            </button>
          </form>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-[15px] bg-[rgba(255,106,69,0.16)] p-3.5">
            <div className="font-mono text-2xl font-semibold text-[#FF8B6D]">
              {totalPoints.toLocaleString()}
            </div>
            <div className="ns-label mt-1 text-[9px] tracking-[0.12em] text-[rgba(245,242,234,0.55)]">
              Points · all programs
            </div>
          </div>
          <div className="rounded-[15px] bg-[rgba(134,229,188,0.12)] p-3.5">
            <div className="font-mono text-2xl font-semibold text-mint">{activeCount}</div>
            <div className="ns-label mt-1 text-[9px] tracking-[0.12em] text-[rgba(245,242,234,0.55)]">
              Programs joined
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3.5 p-[22px]">
        <div className="ns-card flex flex-col gap-3 p-4">
          <div className="ns-label text-[#4A6258]">Your enrolments</div>
          {enrolments.map((enrolment) => {
            const stats = statsByEnrolmentId.get(enrolment.id);
            return (
              <div key={enrolment.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {enrolment.cohort.opportunity.title}
                  </div>
                  <div className="ns-label mt-0.5 text-[9px] tracking-[0.1em] text-[#4A6258]">
                    {enrolment.cohort.cohortLabel}
                    {stats &&
                      ` · ${stats.points.toLocaleString()} pts · ${stats.attendancePercent}% attend`}
                  </div>
                </div>
                <span className="ns-label rounded-full bg-[rgba(16,36,30,0.06)] px-2.5 py-1 text-[9px] text-[#4A6258]">
                  {STATUS_LABEL[enrolment.status]}
                </span>
              </div>
            );
          })}
          {enrolments.length === 0 && <p className="text-sm text-[#4A6258]">No enrolments yet.</p>}
        </div>

        <div className="ns-card flex flex-col gap-3 p-4">
          <div className="ns-label text-[#4A6258]">Interests</div>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <span
                key={t.topicId}
                className="rounded-full bg-[rgba(16,36,30,0.06)] px-3 py-1 text-sm"
              >
                {t.topic.label}
              </span>
            ))}
            {topics.length === 0 && <p className="text-sm text-[#4A6258]">None chosen.</p>}
          </div>
        </div>
      </div>
      <BottomNav active="/me" />
    </>
  );
}
