'use server';

import { redirect } from 'next/navigation';
import { signIn, auth } from '@/lib/auth';
import {
  createUserWithEmailPassword,
  authenticateWithEmailPassword,
  AccountError,
  PasswordSchema,
} from '@/modules/identity';
import {
  previewInvitationByToken,
  acceptInvitationByToken,
  declineInvitationByToken,
  InvitationError,
} from '@/modules/learning';
import { verifySession } from '@/lib/dal';

export type JoinFormState = { error?: string } | undefined;

async function requirePendingInvitation(token: string) {
  const preview = await previewInvitationByToken(token);
  if (!preview || preview.invitation.status !== 'PENDING') {
    return null;
  }
  return preview;
}

export async function signupAndAcceptAction(
  token: string,
  _prevState: JoinFormState,
  formData: FormData,
): Promise<JoinFormState> {
  const preview = await requirePendingInvitation(token);
  if (!preview) return { error: 'This invite is no longer available.' };

  const name = String(formData.get('name') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (name.length < 2) return { error: 'Enter your name.' };

  const passwordCheck = PasswordSchema.safeParse(password);
  if (!passwordCheck.success) {
    return { error: passwordCheck.error.issues[0]?.message ?? 'Choose a stronger password.' };
  }

  let userId: string;
  try {
    const created = await createUserWithEmailPassword({
      name,
      email: preview.invitation.normalizedEmail,
      password,
      // Arriving via the emailed invite link already proves control of this
      // address — no separate "verify your email" round-trip needed.
      verifyImmediately: true,
    });
    userId = created.userId;
  } catch (error) {
    if (error instanceof AccountError) {
      return { error: 'An account already exists for this email — log in instead.' };
    }
    throw error;
  }

  await acceptInvitationByToken({ rawToken: token, userId });

  await signIn('credentials', {
    email: preview.invitation.normalizedEmail,
    password,
    redirectTo: '/programs',
  });
}

export async function loginAndAcceptAction(
  token: string,
  _prevState: JoinFormState,
  formData: FormData,
): Promise<JoinFormState> {
  const preview = await requirePendingInvitation(token);
  if (!preview) return { error: 'This invite is no longer available.' };

  const password = String(formData.get('password') ?? '');
  const user = await authenticateWithEmailPassword(preview.invitation.normalizedEmail, password);
  if (!user) return { error: 'Incorrect password.' };

  try {
    await acceptInvitationByToken({ rawToken: token, userId: user.id });
  } catch (error) {
    if (error instanceof InvitationError) return { error: error.message };
    throw error;
  }

  await signIn('credentials', {
    email: preview.invitation.normalizedEmail,
    password,
    redirectTo: '/programs',
  });
}

export async function acceptInvitationTokenAction(token: string): Promise<void> {
  const { userId } = await verifySession();
  try {
    await acceptInvitationByToken({ rawToken: token, userId });
  } catch (error) {
    if (error instanceof InvitationError) {
      redirect(`/join/${token}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  redirect('/programs');
}

export async function declineInvitationTokenAction(token: string): Promise<void> {
  await declineInvitationByToken(token);
  const session = await auth();
  redirect(session?.user?.id ? '/programs' : '/login');
}
