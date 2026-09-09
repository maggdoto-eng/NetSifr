import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { avatarFor } from '@/lib/avatars';
import { ParticipantTopBar } from './participant-top-bar';

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await verifySession();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { persona: true },
  });
  if (!user.onboardedAt) redirect('/onboarding');

  // Desktop-first shell (prototype's participant web app): a sticky pine top
  // bar over the warm canvas. Each page supplies its own `.shell` content.
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-app)' }}>
      <ParticipantTopBar
        personaLabel={(user.persona?.name ?? 'Member').toUpperCase()}
        avatar={avatarFor(user.avatarKey)}
      />
      <main>{children}</main>
    </div>
  );
}
