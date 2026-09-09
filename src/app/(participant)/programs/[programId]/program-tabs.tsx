'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function ProgramTabs({ programId }: { programId: string }) {
  const pathname = usePathname();
  const base = `/programs/${programId}`;
  const tabs = [
    { href: base, label: 'Home', match: (p: string) => p === base },
    { href: `${base}/weeks`, label: 'Weeks', match: (p: string) => p.startsWith(`${base}/weeks`) },
    { href: `${base}/progress`, label: 'Progress', match: (p: string) => p === `${base}/progress` },
    { href: `${base}/cohort`, label: 'Cohort', match: (p: string) => p === `${base}/cohort` },
  ];

  return (
    <div className="tabs">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="tab"
          aria-current={t.match(pathname) ? 'page' : undefined}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
