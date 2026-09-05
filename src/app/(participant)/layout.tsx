import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await verifySession();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.onboardedAt) redirect('/onboarding');

  // The participant experience is a mobile design (per the prototype's phone
  // artboards). On desktop we present it centred as a phone-style frame on the
  // warm canvas backdrop, so it reads as intentional rather than a lost
  // column; on a phone it fills the screen. Each screen owns its own pine
  // hero, and logout lives on /me.
  return (
    <div className="flex min-h-dvh justify-center bg-[#E9E5DA] md:py-10">
      <div className="flex w-full max-w-[440px] flex-col overflow-hidden bg-[#F5F2EA] md:min-h-[720px] md:rounded-[34px] md:shadow-[0_26px_60px_rgba(11,36,28,0.22)] md:ring-1 md:ring-[rgba(16,36,30,0.08)]">
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
