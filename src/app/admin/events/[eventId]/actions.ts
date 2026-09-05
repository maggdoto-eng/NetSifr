'use server';

import { revalidatePath } from 'next/cache';
import { createOccurrence, updateOccurrenceStatus } from '@/modules/events';
import { requireAdminContext } from '@/app/admin/action-context';
import { CreateOccurrenceSchema } from '../schemas';

export type CreateOccurrenceState = { error?: string } | undefined;

export async function createOccurrenceAction(
  eventId: string,
  _prevState: CreateOccurrenceState,
  formData: FormData,
): Promise<CreateOccurrenceState> {
  const { userId, organizationId } = await requireAdminContext();

  const capacityRaw = formData.get('capacity');
  const parsed = CreateOccurrenceSchema.safeParse({
    startsAt: formData.get('startsAt'),
    endsAt: formData.get('endsAt'),
    locationMode: formData.get('locationMode'),
    capacity: capacityRaw ? capacityRaw : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  await createOccurrence({
    eventId,
    organizationId,
    ownerUserId: userId,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    locationMode: parsed.data.locationMode,
    capacity: parsed.data.capacity,
  });

  revalidatePath(`/admin/events/${eventId}`);
  return undefined;
}

export async function publishOccurrenceAction(input: { eventId: string; occurrenceId: string }) {
  const { userId, organizationId } = await requireAdminContext();
  await updateOccurrenceStatus({
    occurrenceId: input.occurrenceId,
    organizationId,
    actingUserId: userId,
    status: 'LIVE',
  });
  revalidatePath(`/admin/events/${input.eventId}`);
}

export async function completeOccurrenceAction(input: { eventId: string; occurrenceId: string }) {
  const { userId, organizationId } = await requireAdminContext();
  await updateOccurrenceStatus({
    occurrenceId: input.occurrenceId,
    organizationId,
    actingUserId: userId,
    status: 'COMPLETED',
  });
  revalidatePath(`/admin/events/${input.eventId}`);
}

export async function cancelOccurrenceAction(input: { eventId: string; occurrenceId: string }) {
  const { userId, organizationId } = await requireAdminContext();
  await updateOccurrenceStatus({
    occurrenceId: input.occurrenceId,
    organizationId,
    actingUserId: userId,
    status: 'CANCELLED',
  });
  revalidatePath(`/admin/events/${input.eventId}`);
}
