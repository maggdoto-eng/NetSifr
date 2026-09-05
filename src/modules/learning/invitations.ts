import 'server-only';
import { prisma } from '@/lib/prisma';
import { generateToken, hashToken } from '@/lib/tokens';
import { normalizeEmail } from '@/modules/identity';
import { assertCohortInOrg } from '@/modules/organizations';
import { requireAppUrl } from '@/lib/url';
import { assertWithinRateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email';
import type { Invitation } from '@/generated/prisma/client';

const INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export class InvitationError extends Error {}

export async function generateInvitation(input: {
  cohortId: string;
  organizationId: string;
  email: string;
  createdByUserId: string;
}): Promise<{ url: string }> {
  await assertCohortInOrg(input.cohortId, input.organizationId);
  await assertWithinRateLimit(`invite:admin:${input.createdByUserId}`, {
    limit: 50,
    windowMs: 60 * 60 * 1000,
  });

  const normalizedEmail = normalizeEmail(input.email);
  const { raw, hash } = generateToken();

  const [, cohort] = await Promise.all([
    prisma.invitation.create({
      data: {
        cohortId: input.cohortId,
        normalizedEmail,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        createdByUserId: input.createdByUserId,
      },
    }),
    prisma.cohort.findUniqueOrThrow({
      where: { id: input.cohortId },
      include: { opportunity: true },
    }),
  ]);

  const url = `${requireAppUrl()}/join/${raw}`;

  await sendEmail({
    to: normalizedEmail,
    subject: `You're invited to ${cohort.opportunity.title}`,
    text: `You've been invited to join "${cohort.opportunity.title}" on NetSifr:\n\n${url}\n\nThis link expires in 14 days.`,
    html: `<p>You've been invited to join <strong>${cohort.opportunity.title}</strong> on NetSifr:</p><p><a href="${url}">${url}</a></p><p>This link expires in 14 days.</p>`,
  });

  return { url };
}

export async function getInvitationsForCohort(cohortId: string, organizationId: string) {
  await assertCohortInOrg(cohortId, organizationId);
  return prisma.invitation.findMany({ where: { cohortId }, orderBy: { createdAt: 'desc' } });
}

async function resolveInvitationByToken(rawToken: string): Promise<Invitation | null> {
  const tokenHash = hashToken(rawToken);
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash } });
  if (!invitation) return null;

  if (invitation.status === 'PENDING' && invitation.expiresAt < new Date()) {
    return prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
  }
  return invitation;
}

export async function previewInvitationByToken(rawToken: string) {
  const invitation = await resolveInvitationByToken(rawToken);
  if (!invitation) return null;
  const cohort = await prisma.cohort.findUnique({
    where: { id: invitation.cohortId },
    include: { opportunity: true },
  });
  if (!cohort) return null;
  return { invitation, cohort };
}

async function acceptInvitationRecord(
  invitation: Invitation,
  userId: string,
): Promise<{ cohortId: string }> {
  if (invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
    throw new InvitationError('This invite has already been used, declined, or has expired.');
  }

  const credential = await prisma.credential.findUnique({
    where: { type_identifier: { type: 'EMAIL_PASSWORD', identifier: invitation.normalizedEmail } },
  });
  if (!credential || credential.userId !== userId || !credential.verifiedAt) {
    throw new InvitationError('Sign in with the email address this invite was sent to.');
  }

  const cohort = await prisma.cohort.findUniqueOrThrow({ where: { id: invitation.cohortId } });

  await prisma.$transaction([
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', acceptedByUserId: userId },
    }),
    prisma.enrolment.upsert({
      where: { userId_cohortId: { userId, cohortId: invitation.cohortId } },
      create: {
        userId,
        cohortId: invitation.cohortId,
        organizationId: cohort.organizationId,
        status: 'ACTIVE',
      },
      update: { status: 'ACTIVE', withdrawnAt: null },
    }),
  ]);

  return { cohortId: invitation.cohortId };
}

export async function acceptInvitationByToken(input: {
  rawToken: string;
  userId: string;
}): Promise<{ cohortId: string }> {
  const invitation = await resolveInvitationByToken(input.rawToken);
  if (!invitation) throw new InvitationError('This invite link is invalid.');
  return acceptInvitationRecord(invitation, input.userId);
}

export async function declineInvitationByToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.invitation.updateMany({
    where: { tokenHash, status: 'PENDING' },
    data: { status: 'DECLINED' },
  });
}

/** Invitations addressed to any of the current user's verified emails — powers the /programs picker's inline Accept/Later. */
export async function getPendingInvitationsForUser(userId: string) {
  const credentials = await prisma.credential.findMany({
    where: { userId, type: 'EMAIL_PASSWORD', verifiedAt: { not: null } },
    select: { identifier: true },
  });
  const emails = credentials.map((c) => c.identifier);
  if (emails.length === 0) return [];

  return prisma.invitation.findMany({
    where: { normalizedEmail: { in: emails }, status: 'PENDING', expiresAt: { gt: new Date() } },
    include: { cohort: { include: { opportunity: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function acceptInvitationById(input: {
  invitationId: string;
  userId: string;
}): Promise<{ cohortId: string }> {
  const invitation = await prisma.invitation.findUniqueOrThrow({
    where: { id: input.invitationId },
  });
  return acceptInvitationRecord(invitation, input.userId);
}

export async function declineInvitationById(input: {
  invitationId: string;
  userId: string;
}): Promise<void> {
  const invitation = await prisma.invitation.findUniqueOrThrow({
    where: { id: input.invitationId },
  });
  const credential = await prisma.credential.findUnique({
    where: { type_identifier: { type: 'EMAIL_PASSWORD', identifier: invitation.normalizedEmail } },
  });
  if (!credential || credential.userId !== input.userId) {
    throw new InvitationError('This invitation is not addressed to your account.');
  }
  await prisma.invitation.updateMany({
    where: { id: input.invitationId, status: 'PENDING' },
    data: { status: 'DECLINED' },
  });
}
