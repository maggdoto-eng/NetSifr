import { redirect } from 'next/navigation';

// An org-wide overview dashboard is planned (see docs/plan.md's roadmap —
// "CSV export + polish") but not built yet; Programs is the real landing
// page for now, matching the original prototype's own admin entry point.
export default function AdminIndexPage() {
  redirect('/admin/programs');
}
