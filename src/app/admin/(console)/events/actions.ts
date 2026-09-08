'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createEvent } from '@/modules/events';
import { requireAdminContext } from '@/app/admin/action-context';
import { CreateEventSchema } from './schemas';

export type CreateEventState = { error?: string } | undefined;

export async function createEventAction(
  _prevState: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const { organizationId } = await requireAdminContext();

  const parsed = CreateEventSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  const { eventId } = await createEvent({
    organizationId,
    title: parsed.data.title,
    description: parsed.data.description,
  });

  revalidatePath('/admin/events');
  redirect(`/admin/events/${eventId}`);
}
