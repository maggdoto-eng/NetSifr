import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { getDefaultOrganization } from '@/lib/org';
import { OnboardingWizard } from './onboarding-wizard';

export default async function OnboardingPage() {
  const { userId } = await verifySession();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.onboardedAt) redirect('/programs');

  const org = await getDefaultOrganization();
  const topics = await prisma.topic.findMany({
    where: { organizationId: org.id },
    orderBy: { label: 'asc' },
  });

  return (
    <OnboardingWizard
      defaultName={user.name}
      topics={topics.map((t) => ({ id: t.id, label: t.label }))}
    />
  );
}
