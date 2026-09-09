import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { getEnrolmentsForUser, computeUserAttendancePercent } from '@/modules/learning';
import { getTotalPoints, getCohortPoints } from '@/modules/recognition';
import { avatarFor } from '@/lib/avatars';
import { logoutAction } from '@/app/(auth)/actions';

export default async function MePage() {
  const { userId } = await verifySession();

  const [user, credential, enrolments, topics] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { persona: true } }),
    prisma.credential.findFirst({
      where: { userId, type: 'EMAIL_PASSWORD' },
      select: { identifier: true },
    }),
    getEnrolmentsForUser(userId),
    prisma.userTopic.findMany({ where: { userId }, include: { topic: true } }),
  ]);
  const email = credential?.identifier ?? '';

  const avatar = avatarFor(user.avatarKey);
  const joinedCount = enrolments.length;

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
    <div className="shell">
      <div className="row row--top" style={{ marginBottom: 'var(--s6)' }}>
        <span
          className="avatar avatar--lg"
          style={{ background: avatar.bg, color: avatar.fg }}
        >
          {avatar.glyph}
        </span>
        <div>
          <h1 className="display-lg">{user.name}</h1>
          <div className="mono" style={{ marginTop: 4 }}>
            {user.persona?.name ?? 'Member'} · {email}
          </div>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <div className="card stack">
            <div className="title">Enrolments</div>
            {enrolments.length === 0 && <p className="muted">No enrolments yet.</p>}
            {enrolments.map((enrolment) => {
              const stats = statsByEnrolmentId.get(enrolment.id);
              const complete = enrolment.status === 'COMPLETED';
              return (
                <div className="row" key={enrolment.id}>
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>{enrolment.cohort.opportunity.title}</div>
                    <div className="mono" style={{ marginTop: 4 }}>
                      {enrolment.cohort.cohortLabel} · {(stats?.points ?? 0).toLocaleString()} pts ·{' '}
                      {stats?.attendancePercent ?? 0}% attendance
                    </div>
                  </div>
                  <span className={complete ? 'pill pill--done' : 'pill'}>
                    {complete ? 'Complete' : 'Active'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="card stack">
            <div className="title">Interests</div>
            <div className="row wrap" style={{ gap: 'var(--s2)' }}>
              {topics.length === 0 && <p className="muted">None chosen.</p>}
              {topics.map((t) => (
                <span key={t.topicId} className="chip" style={{ cursor: 'default' }}>
                  {t.topic.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card card--dark">
            <div className="mono mono--onDark">Across all programs</div>
            <div
              className="figure"
              style={{ fontSize: 44, color: 'var(--mint)', marginTop: 'var(--s3)' }}
            >
              {totalPoints.toLocaleString()}
            </div>
            <div style={{ color: 'var(--on-dark-body)', marginTop: 4 }}>
              {joinedCount} {joinedCount === 1 ? 'program' : 'programs'} joined
            </div>
          </div>

          <Link href="/onboarding" className="btn btn--ghost btn--block">
            Redo account setup
          </Link>

          <form action={logoutAction}>
            <button type="submit" className="btn btn--ghost btn--block">
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
