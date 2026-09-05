import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/programs', label: 'Programs' },
  { href: '/discover', label: 'Discover' },
  { href: '/events', label: 'Events' },
  { href: '/volunteering', label: 'Volunteer' },
  { href: '/me', label: 'Me' },
] as const;

/**
 * Top-level app nav — used by the pages that sit outside any specific
 * program (/programs, /discover, /events, /me). Deliberately not part of
 * the shared (participant) layout: /programs/[programId]/* has its own
 * in-program bottom nav (Home/Weeks/Cohort/Me), and nesting this one
 * around it in the parent layout would stack two nav bars on screen.
 */
export function BottomNav({ active }: { active: (typeof NAV_ITEMS)[number]['href'] }) {
  return (
    <nav className="flex h-16 flex-none items-center justify-around border-t border-zinc-200 bg-white">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center gap-1 px-4 text-xs ${
            active === item.href ? 'font-semibold text-zinc-900' : 'text-zinc-600'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
