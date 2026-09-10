'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/programs', label: 'My programs' },
  { href: '/discover', label: 'Discover' },
  { href: '/community', label: 'Community' },
  { href: '/events', label: 'Events' },
  { href: '/volunteering', label: 'Volunteer' },
] as const;

/**
 * The participant app's global top bar (prototype's `.p-topbar`). Dark pine,
 * sticky. Left: NetSifr wordmark + section nav. Right: the signed-in person's
 * persona and avatar, linking to their profile.
 */
export function ParticipantTopBar(props: {
  personaLabel: string;
  avatar: { glyph: string; bg: string; fg: string };
  unreadCount: number;
}) {
  const pathname = usePathname();

  return (
    <header className="p-topbar">
      <Link href="/programs" className="p-topbar__brand" style={{ color: 'var(--coral)' }}>
        NetSifr
      </Link>
      <nav className="p-topbar__nav">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/notifications"
        aria-label={`Notifications${props.unreadCount > 0 ? `, ${props.unreadCount} unread` : ''}`}
        aria-current={pathname === '/notifications' ? 'page' : undefined}
        className="row"
        style={{ marginLeft: 'auto', position: 'relative', color: 'var(--fg-on-dark)', fontSize: 18 }}
      >
        <span aria-hidden>🔔</span>
        {props.unreadCount > 0 && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -6,
              right: -8,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 999,
              background: 'var(--coral)',
              color: 'var(--fg-on-coral)',
              fontSize: 10,
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {props.unreadCount > 9 ? '9+' : props.unreadCount}
          </span>
        )}
      </Link>
      <Link
        href="/me"
        className="row"
        style={{ gap: 'var(--s3)', color: 'var(--fg-on-dark)' }}
      >
        <span className="mono" style={{ color: 'var(--on-dark-faint)' }}>
          {props.personaLabel}
        </span>
        <span className="avatar" style={{ background: props.avatar.bg, color: props.avatar.fg }}>
          {props.avatar.glyph}
        </span>
      </Link>
    </header>
  );
}
