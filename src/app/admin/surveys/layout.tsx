import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDefaultOrganization } from '@/lib/org';
import { requireOrgAdmin } from '@/lib/dal';

/**
 * The Surveys admin is a standalone app in its own NetSifr brand (leaf-green /
 * slate, Poppins) — reached from the LMS console sidebar, but rendered outside
 * the pine console rail. Guards for an org admin here since it's not under the
 * (console) layout.
 */
export default async function SurveysAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');
  const org = await getDefaultOrganization();
  await requireOrgAdmin(org.id);

  return (
    <div className="ns-ds" style={{ minHeight: '100vh', background: 'var(--slate-50)' }}>
      {children}
    </div>
  );
}
