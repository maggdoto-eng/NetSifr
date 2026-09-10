'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/(auth)/actions';

const MARK_COLORS = ['#86E5BC', '#FF6A45', '#123B2E', '#E3D9C2'];

type ProgramLite = { id: string; title: string; cohortLabel: string; index: number };

const ORG_LINKS = [
  { href: '/admin/programs', label: 'All programs', exact: true },
  { href: '/admin/people', label: 'People' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/volunteering', label: 'Volunteering' },
  { href: '/admin/moderation', label: 'Moderation' },
];

const PROGRAM_TABS = [
  { seg: 'builder', label: 'Builder' },
  { seg: 'attendance', label: 'Attendance' },
  { seg: 'submissions', label: 'Submissions' },
  { seg: 'announcements', label: 'Announcements' },
  { seg: 'invites', label: 'Invites' },
  { seg: 'settings', label: 'Settings' },
];

export function AdminRail({
  programs,
  signedIn,
}: {
  programs: ProgramLite[];
  signedIn: { name: string; role: string };
}) {
  const pathname = usePathname();

  const match = pathname.match(/^\/admin\/programs\/([^/]+)(?:\/([^/]+))?/);
  const programId = match?.[1];
  const activeSeg = match?.[2] ?? 'builder';
  const currentProgram = programId ? programs.find((p) => p.id === programId) : undefined;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="a-rail">
      <div className="a-rail__brand">
        NetSifr <span className="tag">Admin</span>
      </div>

      <div className="a-rail__group">
        <div className="a-rail__label">Organisation</div>
        {ORG_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="a-rail__link"
            aria-current={isActive(l.href, l.exact) && !currentProgram ? 'page' : undefined}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {currentProgram && (
        <>
          <div
            className="a-rail__program"
            style={{ marginTop: 'var(--s2)' }}
          >
            <span
              className="mark mark--sm"
              style={{ background: MARK_COLORS[currentProgram.index % MARK_COLORS.length] }}
            />
            <div className="grow">
              <div className="truncate" style={{ fontWeight: 700, fontSize: 14 }}>
                {currentProgram.title}
              </div>
              <div className="mono" style={{ color: 'var(--on-dark-faint)', marginTop: 2 }}>
                {currentProgram.cohortLabel}
              </div>
            </div>
          </div>
          <div className="a-rail__group">
            <div className="a-rail__label">This program</div>
            {PROGRAM_TABS.map((t) => (
              <Link
                key={t.seg}
                href={`/admin/programs/${currentProgram.id}/${t.seg}`}
                className="a-rail__link"
                aria-current={activeSeg === t.seg ? 'page' : undefined}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="a-rail__foot">
        <div className="a-rail__label" style={{ padding: 0, marginBottom: 6 }}>
          Signed in
        </div>
        <div style={{ fontSize: 14 }}>{signedIn.name}</div>
        <div className="mono" style={{ color: 'var(--on-dark-faint)', marginTop: 2 }}>
          {signedIn.role}
        </div>
        <form action={logoutAction} style={{ marginTop: 'var(--s3)' }}>
          <button type="submit" className="btn btn--onDark btn--sm btn--block">
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
