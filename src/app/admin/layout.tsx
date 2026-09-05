import Link from 'next/link';
import { getDefaultOrganization } from '@/lib/org';
import { requireOrgAdmin } from '@/lib/dal';
import { logoutAction } from '@/app/(auth)/actions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const org = await getDefaultOrganization();
  await requireOrgAdmin(org.id);

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F2EA]">
      <header className="ns-hero flex h-14 flex-none items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/admin/programs"
            className="font-[family-name:var(--font-display)] text-[15px] font-extrabold tracking-[-0.02em] text-cream"
          >
            NetSifr <span className="ns-label ml-1 text-[9px] text-mint">Admin</span>
          </Link>
          <nav className="flex gap-5 text-[13px] font-medium text-[rgba(245,242,234,0.72)]">
            <Link href="/admin/programs" className="hover:text-cream">
              Programs
            </Link>
            <Link href="/admin/events" className="hover:text-cream">
              Events
            </Link>
            <Link href="/admin/volunteering" className="hover:text-cream">
              Volunteering
            </Link>
          </nav>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="ns-label rounded-full bg-[rgba(245,242,234,0.12)] px-3 py-1.5 text-[9px] text-cream"
          >
            Log out
          </button>
        </form>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
