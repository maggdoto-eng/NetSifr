import 'server-only';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { assertWithinRateLimit } from '@/lib/rate-limit';
import { requireAppUrl } from '@/lib/url';
import { generateToken, hashToken } from '@/lib/tokens';

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export class EmailVerificationError extends Error {}

export async function sendEmailVerification(credentialId: string, email: string): Promise<void> {
  await assertWithinRateLimit(`email-verify:send:${email}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  const { raw, hash } = generateToken();
  await prisma.emailVerificationToken.create({
    data: { credentialId, tokenHash: hash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const url = `${requireAppUrl()}/verify-email/${raw}`;
  await sendEmail({
    to: email,
    subject: 'Verify your NetSifr email',
    text: `Verify your email to finish setting up your NetSifr account:\n\n${url}\n\nThis link expires in 24 hours.`,
    html: `<p>Verify your email to finish setting up your NetSifr account:</p><p><a href="${url}">${url}</a></p><p>This link expires in 24 hours.</p>`,
  });
}

export async function confirmEmailVerification(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!token || token.usedAt || token.expiresAt < new Date()) {
    throw new EmailVerificationError('This verification link is invalid or has expired.');
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    prisma.credential.update({
      where: { id: token.credentialId },
      data: { verifiedAt: new Date() },
    }),
  ]);
}
