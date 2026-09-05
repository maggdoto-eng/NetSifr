import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';

/**
 * Phase 1 seeds exactly one Organization. Every table is still scoped by
 * organizationId (see docs/plan.md) so a second org is a data change later,
 * not a rewrite — this helper is the one place that currently assumes
 * "there's only one" for convenience.
 */
export const getDefaultOrganization = cache(async () => {
  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!organization) {
    throw new Error('No organization seeded — run `npm run db:seed`.');
  }
  return organization;
});
