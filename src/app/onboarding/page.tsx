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
  const [topics, personaRows] = await Promise.all([
    prisma.topic.findMany({ where: { organizationId: org.id }, orderBy: { label: 'asc' } }),
    prisma.persona.findMany({ select: { key: true, name: true } }),
  ]);

  // Ordered to match computePersonaIndex's mapping (policy / ground / narrative).
  const PERSONA_KEY_ORDER = ['policy-navigator', 'ground-organizer', 'narrative-builder'];
  const personas = PERSONA_KEY_ORDER.map(
    (key) => personaRows.find((p) => p.key === key)?.name ?? 'Member',
  );

  return (
    <OnboardingWizard
      defaultName={user.name}
      topics={topics.map((t) => ({ id: t.id, label: t.label }))}
      personas={personas}
    />
  );
}
