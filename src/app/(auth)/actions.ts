'use server';

import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/lib/auth';
import {
  LoginSchema,
  RequestPasswordResetSchema,
  ConfirmPasswordResetSchema,
  requestPasswordReset,
  confirmPasswordReset,
  confirmEmailVerification,
  PasswordResetError,
  EmailVerificationError,
} from '@/modules/identity';

export type ActionState = { error?: string; success?: boolean } | undefined;

export async function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: 'Enter a valid email and password.' };
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/programs',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password.' };
    }
    throw error; // signIn's own redirect() throws internally — must propagate.
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}

export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = RequestPasswordResetSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { error: 'Enter a valid email.' };
  }

  await requestPasswordReset(parsed.data.email);
  // Always reports success, whether or not the account exists — see
  // requestPasswordReset's own doc comment.
  return { success: true };
}

export async function confirmPasswordResetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ConfirmPasswordResetSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check your input and try again.' };
  }

  try {
    await confirmPasswordReset(parsed.data.token, parsed.data.password);
  } catch (error) {
    if (error instanceof PasswordResetError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect('/login?resetSuccess=1');
}

export async function confirmEmailVerificationForToken(token: string): Promise<{ error?: string }> {
  try {
    await confirmEmailVerification(token);
    return {};
  } catch (error) {
    if (error instanceof EmailVerificationError) {
      return { error: error.message };
    }
    throw error;
  }
}
