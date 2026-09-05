import 'server-only';
import { prisma } from '@/lib/prisma';
import { assertOccurrenceInOrg } from '@/modules/organizations';

export class FeedbackError extends Error {}

/** Requires an EventCheckIn row to exist first — feedback about an event you didn't attend isn't meaningful. */
export async function submitFeedback(input: {
  userId: string;
  eventOccurrenceId: string;
  rating: number;
  comment?: string;
}): Promise<void> {
  if (input.rating < 1 || input.rating > 5) {
    throw new FeedbackError('Rating must be between 1 and 5.');
  }

  const checkIn = await prisma.eventCheckIn.findUnique({
    where: {
      userId_eventOccurrenceId: {
        userId: input.userId,
        eventOccurrenceId: input.eventOccurrenceId,
      },
    },
  });
  if (!checkIn) {
    throw new FeedbackError('Only checked-in attendees can leave feedback.');
  }

  await prisma.eventFeedback.upsert({
    where: {
      userId_eventOccurrenceId: {
        userId: input.userId,
        eventOccurrenceId: input.eventOccurrenceId,
      },
    },
    create: {
      userId: input.userId,
      eventOccurrenceId: input.eventOccurrenceId,
      rating: input.rating,
      comment: input.comment,
    },
    update: { rating: input.rating, comment: input.comment, submittedAt: new Date() },
  });
}

export async function getUserFeedback(userId: string, eventOccurrenceId: string) {
  return prisma.eventFeedback.findUnique({
    where: { userId_eventOccurrenceId: { userId, eventOccurrenceId } },
  });
}

/** Admin-facing — list + average, for the occurrence's Feedback tab. Org-scoped: the occurrence must belong to the caller's org. */
export async function getFeedbackForOccurrence(eventOccurrenceId: string, organizationId: string) {
  await assertOccurrenceInOrg(eventOccurrenceId, organizationId);
  const feedback = await prisma.eventFeedback.findMany({
    where: { eventOccurrenceId },
    include: { user: true },
    orderBy: { submittedAt: 'desc' },
  });
  const averageRating =
    feedback.length === 0 ? null : feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
  return { feedback, averageRating };
}
