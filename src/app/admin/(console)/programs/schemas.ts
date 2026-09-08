import { z } from 'zod';

export const CreateProgramSchema = z.object({
  title: z.string().trim().min(3, { error: 'Give the program a title (at least 3 characters).' }),
  cohortLabel: z.string().trim().min(1, { error: 'Give this cohort a label.' }),
  weekCount: z.coerce
    .number()
    .int()
    .min(1, { error: 'At least 1 week.' })
    .max(20, { error: 'At most 20 weeks.' }),
});
