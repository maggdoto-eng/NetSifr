import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertInOrg } from '@/modules/organizations';
import type { ShiftSignupStatus } from '@/generated/prisma/client';
import { isAcceptedApplicant } from './applications';

export class ShiftError extends Error {}

/** Statuses that occupy a seat (everything except a cancelled/no-show signup). */
const ACTIVE_SIGNUP_STATUSES: ShiftSignupStatus[] = ['SIGNED_UP', 'CONFIRMED', 'ATTENDED'];

/**
 * Only an ACCEPTED applicant may take a shift. Signing up past capacity is
 * refused (no waitlist — see docs/plan.md's Phase 3 decision), inside a
 * row-locked transaction so two concurrent signups for the last seat can't
 * both succeed.
 */
export async function signUpForShift(input: { userId: string; shiftId: string }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "VolunteerShift" WHERE id = ${input.shiftId} FOR UPDATE`;

    const shift = await tx.volunteerShift.findUniqueOrThrow({ where: { id: input.shiftId } });

    if (!(await isAcceptedApplicant(input.userId, shift.volunteerOpportunityId))) {
      throw new ShiftError('Only accepted volunteers can sign up for a shift.');
    }

    const existing = await tx.shiftSignup.findUnique({
      where: { userId_shiftId: { userId: input.userId, shiftId: input.shiftId } },
    });
    if (existing && ACTIVE_SIGNUP_STATUSES.includes(existing.status)) {
      throw new ShiftError("You're already signed up for this shift.");
    }

    if (shift.capacity != null) {
      const taken = await tx.shiftSignup.count({
        where: { shiftId: input.shiftId, status: { in: ACTIVE_SIGNUP_STATUSES } },
      });
      if (taken >= shift.capacity) {
        throw new ShiftError('This shift is full — please pick another slot.');
      }
    }

    if (existing) {
      await tx.shiftSignup.update({
        where: { id: existing.id },
        data: { status: 'SIGNED_UP', signedUpAt: new Date() },
      });
    } else {
      await tx.shiftSignup.create({
        data: { userId: input.userId, shiftId: input.shiftId, status: 'SIGNED_UP' },
      });
    }
  });
}

export async function cancelSignup(input: { userId: string; signupId: string }): Promise<void> {
  const signup = await prisma.shiftSignup.findUniqueOrThrow({ where: { id: input.signupId } });
  if (signup.userId !== input.userId) {
    throw new ShiftError('This signup is not yours to cancel.');
  }
  await prisma.shiftSignup.update({
    where: { id: signup.id },
    data: { status: 'CANCELLED' },
  });
}

/** Admin marks attendance on a signup: CONFIRMED / ATTENDED / NO_SHOW. */
export async function updateSignupStatus(input: {
  signupId: string;
  organizationId: string;
  actingUserId: string;
  status: 'CONFIRMED' | 'ATTENDED' | 'NO_SHOW';
}): Promise<void> {
  const signup = await prisma.shiftSignup.findUniqueOrThrow({
    where: { id: input.signupId },
    include: { shift: { select: { organizationId: true } } },
  });
  assertInOrg(signup.shift.organizationId, input.organizationId);

  await prisma.shiftSignup.update({
    where: { id: signup.id },
    data: { status: input.status },
  });
}

export async function getShiftsForOpportunity(volunteerOpportunityId: string) {
  return prisma.volunteerShift.findMany({
    where: { volunteerOpportunityId },
    include: {
      signups: {
        where: { status: { in: ACTIVE_SIGNUP_STATUSES } },
        select: { id: true },
      },
    },
    orderBy: { startsAt: 'asc' },
  });
}

/** Admin roster of a shift's signups — org-scoped, includes email. */
export async function getSignupsForShift(shiftId: string, organizationId: string) {
  const shift = await prisma.volunteerShift.findUnique({
    where: { id: shiftId },
    select: { organizationId: true },
  });
  assertInOrg(shift?.organizationId, organizationId);

  return prisma.shiftSignup.findMany({
    where: { shiftId },
    include: {
      user: { include: { credentials: { where: { type: 'EMAIL_PASSWORD' }, take: 1 } } },
    },
    orderBy: { signedUpAt: 'asc' },
  });
}

export async function getUserSignups(userId: string, volunteerOpportunityId: string) {
  return prisma.shiftSignup.findMany({
    where: {
      userId,
      status: { in: ACTIVE_SIGNUP_STATUSES },
      shift: { volunteerOpportunityId },
    },
    include: { shift: true },
  });
}
