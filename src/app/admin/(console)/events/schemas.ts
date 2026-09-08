import { z } from 'zod';

export const CreateEventSchema = z.object({
  title: z.string().trim().min(3, { error: 'Give the event a title (at least 3 characters).' }),
  description: z.string().trim().optional(),
});

export const CreateOccurrenceSchema = z
  .object({
    startsAt: z.string().min(1, { error: 'Pick a start time.' }),
    endsAt: z.string().min(1, { error: 'Pick an end time.' }),
    locationMode: z.enum(['ONLINE', 'PHYSICAL', 'HYBRID']),
    capacity: z.coerce.number().int().min(1).optional(),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    error: 'End time must be after the start time.',
    path: ['endsAt'],
  });
