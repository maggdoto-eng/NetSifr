import 'server-only';
import { prisma } from '@/lib/prisma';
import type { LocationMode, VolunteerApplicationStatus } from '@/generated/prisma/client';

export type DiscoverVolunteerCard = {
  volunteerOpportunityId: string;
  title: string;
  summary: string | null;
  locationMode: LocationMode;
  applyByDate: Date | null;
  myApplicationStatus: VolunteerApplicationStatus | null;
};

/** OPEN volunteer opportunities for the /discover feed, with the current user's application status attached. */
export async function getVolunteerDiscoverCards(
  organizationId: string,
  userId: string,
): Promise<DiscoverVolunteerCard[]> {
  const opportunities = await prisma.volunteerOpportunity.findMany({
    where: { organizationId, status: 'OPEN' },
    include: {
      applications: { where: { userId }, select: { status: true }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  return opportunities.map((o) => ({
    volunteerOpportunityId: o.id,
    title: o.title,
    summary: o.description,
    locationMode: o.locationMode,
    applyByDate: o.applyByDate,
    myApplicationStatus: o.applications[0]?.status ?? null,
  }));
}
