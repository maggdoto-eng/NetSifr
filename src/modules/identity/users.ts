import 'server-only';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPasswordHash } from './passwords';
import { sendEmailVerification } from './email-verification';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class AccountError extends Error {}

/**
 * Creates a brand-new account with an email/password credential. Used by the
 * invite-acceptance flow (Phase 1 has no public self-serve signup — the
 * product is invite-only, see docs/plan.md) and by the seed script's
 * first-admin bootstrap.
 *
 * `verifyImmediately` skips the separate verification email: arriving via a
 * tokenized invite link already proves control of that address, so the
 * invite-accept flow sets verifiedAt at creation instead of sending a
 * second "verify your email" round-trip.
 */
export async function createUserWithEmailPassword(input: {
  name: string;
  email: string;
  password: string;
  avatarKey?: number;
  verifyImmediately?: boolean;
}): Promise<{ userId: string; credentialId: string }> {
  const identifier = normalizeEmail(input.email);

  const existing = await prisma.credential.findUnique({
    where: { type_identifier: { type: 'EMAIL_PASSWORD', identifier } },
  });
  if (existing) {
    throw new AccountError('An account with this email already exists.');
  }

  const secretHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      avatarKey: input.avatarKey ?? 0,
      status: 'ACTIVE',
      credentials: {
        create: {
          type: 'EMAIL_PASSWORD',
          identifier,
          secretHash,
          verifiedAt: input.verifyImmediately ? new Date() : null,
        },
      },
    },
    include: { credentials: true },
  });

  const credential = user.credentials[0];
  if (!input.verifyImmediately) {
    await sendEmailVerification(credential.id, identifier);
  }

  return { userId: user.id, credentialId: credential.id };
}

/**
 * Used by the Auth.js Credentials provider's authorize() — rate limiting is
 * applied by the caller (it needs request IP, which this module doesn't see).
 */
export async function authenticateWithEmailPassword(
  email: string,
  password: string,
): Promise<{ id: string; name: string } | null> {
  const identifier = normalizeEmail(email);

  const credential = await prisma.credential.findUnique({
    where: { type_identifier: { type: 'EMAIL_PASSWORD', identifier } },
    include: { user: true },
  });
  if (!credential || !credential.secretHash) return null;
  if (credential.user.status !== 'ACTIVE') return null;

  const valid = await verifyPasswordHash(credential.secretHash, password);
  if (!valid) return null;

  return { id: credential.user.id, name: credential.user.name };
}
