import { z } from 'zod';

export const CreateVolunteerOpportunitySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { error: 'Give the opportunity a title (at least 3 characters).' }),
  description: z.string().trim().optional(),
  locationMode: z.enum(['ONLINE', 'PHYSICAL', 'HYBRID']),
  applyByDate: z.string().optional(),
});

export const CreateShiftSchema = z
  .object({
    title: z.string().trim().min(1, { error: 'Name the shift.' }),
    startsAt: z.string().min(1, { error: 'Pick a start time.' }),
    endsAt: z.string().min(1, { error: 'Pick an end time.' }),
    capacity: z.coerce.number().int().min(1).optional(),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    error: 'End time must be after the start time.',
    path: ['endsAt'],
  });
