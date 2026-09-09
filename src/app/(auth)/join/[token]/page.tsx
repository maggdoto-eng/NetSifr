import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { previewInvitationByToken } from '@/modules/learning';
import { AcceptPanel } from './accept-panel';
import { LoginAndAcceptForm } from './login-and-accept-form';
import { SignupAndAcceptForm } from './signup-and-accept-form';

export default async function JoinPage({ params, searchParams }: PageProps<'/join/[token]'>) {
  const { token } = await params;
  const search = await searchParams;
  const errorMessage = typeof search.error === 'string' ? search.error : undefined;

  const preview = await previewInvitationByToken(token);
  if (!preview) {
    return <p style={{ color: 'var(--coral)', fontSize: 14 }}>This invite link is invalid.</p>;
  }

  const { invitation, cohort } = preview;

  if (invitation.status === 'EXPIRED') {
    return (
      <p style={{ color: 'var(--coral)', fontSize: 14 }}>
        This invite has expired. Ask your facilitator to resend it.
      </p>
    );
  }
  if (invitation.status !== 'PENDING') {
    return <p className="muted" style={{ fontSize: 14 }}>This invite has already been used.</p>;
  }

  const title = cohort.opportunity.title;
  const session = await auth();

  if (session?.user?.id) {
    return <AcceptPanel token={token} title={title} errorMessage={errorMessage} />;
  }

  const existingCredential = await prisma.credential.findUnique({
    where: { type_identifier: { type: 'EMAIL_PASSWORD', identifier: invitation.normalizedEmail } },
  });

  if (existingCredential) {
    return <LoginAndAcceptForm token={token} email={invitation.normalizedEmail} title={title} />;
  }
  return <SignupAndAcceptForm token={token} email={invitation.normalizedEmail} title={title} />;
}
