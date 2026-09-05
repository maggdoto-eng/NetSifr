import 'server-only';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { assertWithinRateLimit } from '@/lib/rate-limit';
import { requireAppUrl } from '@/lib/url';
import { generateToken, hashToken } from '@/lib/tokens';
import { hashPassword } from './passwords';
import { normalizeEmail } from './users';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export class PasswordResetError extends Error {}

export async function requestPasswordReset(email: string): Promise<void> {
  const identifier = normalizeEmail(email);
  await assertWithinRateLimit(`password-reset:request:${identifier}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  const credential = await prisma.credential.findUnique({
    where: { type_identifier: { type: 'EMAIL_PASSWORD', identifier } },
  });
  // Deliberately do not reveal whether the account exists — caller always
  // sees the same "check your email" response either way.
  if (!credential) return;

  const { raw, hash } = generateToken();
  await prisma.passwordResetToken.create({
    data: {
      credentialId: credential.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const url = `${requireAppUrl()}/reset-password/${raw}`;
  await sendEmail({
    to: identifier,
    subject: 'Reset your NetSifr password',
    text: `Reset your password:\n\n${url}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    html: `<p>Reset your password:</p><p><a href="${url}">${url}</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
  });
}

export async function confirmPasswordReset(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!token || token.usedAt || token.expiresAt < new Date()) {
    throw new PasswordResetError('This reset link is invalid or has expired.');
  }

  const secretHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    prisma.credential.update({ where: { id: token.credentialId }, data: { secretHash } }),
  ]);
}
