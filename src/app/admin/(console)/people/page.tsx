import { prisma } from '@/lib/prisma';
import { getDefaultOrganization } from '@/lib/org';
import { avatarFor } from '@/lib/avatars';
import { AdminTopbar } from '../admin-topbar';

const MARK_COLORS = ['#86E5BC', '#FF6A45', '#123B2E', '#E3D9C2'];

export default async function PeoplePage() {
  const org = await getDefaultOrganization();

  const [memberships, cohorts] = await Promise.all([
    prisma.organizationMembership.findMany({
      where: { organizationId: org.id, status: 'ACTIVE' },
      include: { user: { include: { persona: true } } },
    }),
    prisma.cohort.findMany({
      where: { organizationId: org.id },
      select: { id: true, cohortLabel: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const cohortColor = new Map(cohorts.map((c, i) => [c.id, MARK_COLORS[i % MARK_COLORS.length]]));
  const userIds = memberships.map((m) => m.userId);

  const [enrolments, credentials] = await Promise.all([
    prisma.enrolment.findMany({
      where: { userId: { in: userIds }, cohort: { organizationId: org.id } },
      include: { cohort: { select: { id: true, cohortLabel: true } } },
    }),
    prisma.credential.findMany({
      where: { userId: { in: userIds }, type: 'EMAIL_PASSWORD' },
      select: { userId: true, identifier: true },
    }),
  ]);

  const emailByUser = new Map(credentials.map((c) => [c.userId, c.identifier]));
  const enrolmentsByUser = new Map<string, typeof enrolments>();
  for (const e of enrolments) {
    const list = enrolmentsByUser.get(e.userId) ?? [];
    list.push(e);
    enrolmentsByUser.set(e.userId, list);
  }

  const people = memberships
    .map((m) => ({
      id: m.userId,
      name: m.user.name,
      email: emailByUser.get(m.userId) ?? '',
      avatar: avatarFor(m.user.avatarKey),
      enrolments: enrolmentsByUser.get(m.userId) ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <AdminTopbar trail={[{ label: 'Programs', href: '/admin/programs' }, { label: 'People' }]} />
      <div className="a-main stack">
        <div>
          <h1 className="display-lg">People</h1>
          <p className="lede" style={{ marginTop: 8 }}>
            One account per person, across every program. Enrolments are listed against each.
          </p>
        </div>

        {people.length === 0 ? (
          <div className="empty">Nobody has joined yet. Invite people from a program’s Invites tab.</div>
        ) : (
          <div className="grid-3">
            {people.map((p) => (
              <div key={p.id} className="card stack" style={{ gap: 'var(--s3)' }}>
                <div className="row">
                  <span className="avatar" style={{ background: p.avatar.bg, color: p.avatar.fg }}>
                    {p.avatar.glyph}
                  </span>
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {p.email}
                    </div>
                  </div>
                </div>
                {p.enrolments.length > 0 && (
                  <div className="row wrap" style={{ gap: 'var(--s2)' }}>
                    {p.enrolments.map((e) => (
                      <span
                        key={e.id}
                        className="pill"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: cohortColor.get(e.cohort.id) ?? 'var(--mute)',
                          }}
                        />
                        {e.cohort.cohortLabel}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
