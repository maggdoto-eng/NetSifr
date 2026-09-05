import { z } from 'zod';

export const EmailSchema = z.email({ error: 'Enter a valid email.' }).trim();

export const PasswordSchema = z
  .string()
  .min(8, { error: 'Use at least 8 characters.' })
  .regex(/[a-zA-Z]/, { error: 'Include at least one letter.' })
  .regex(/[0-9]/, { error: 'Include at least one number.' });

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, { error: 'Enter your password.' }),
});

export const RequestPasswordResetSchema = z.object({
  email: EmailSchema,
});

export const ConfirmPasswordResetSchema = z.object({
  token: z.string().min(1),
  password: PasswordSchema,
});
