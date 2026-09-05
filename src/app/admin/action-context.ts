import 'server-only';
import { verifySession } from '@/lib/dal';
import { getDefaultOrganization } from '@/lib/org';
import { assertOrgAdmin } from '@/modules/organizations';

/** Every admin Server Action starts by resolving (and re-verifying) this. */
export async function requireAdminContext() {
  const { userId } = await verifySession();
  const organization = await getDefaultOrganization();
  await assertOrgAdmin(userId, organization.id);
  return { userId, organizationId: organization.id };
}
