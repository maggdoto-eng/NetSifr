'use server';

import { headers } from 'next/headers';
import { startResponse, patchResponse, SurveyError } from '@/modules/surveys';
import { assertWithinRateLimit, RateLimitExceededError } from '@/lib/rate-limit';
import type { Answers } from '@/lib/survey-schema';

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  return (fwd?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown').slice(0, 64);
}

/** Begin a response — rate-limited per IP to curb spam (spec §9). */
export async function startResponseAction(
  slug: string,
  consent?: { agreed: boolean; text: string },
): Promise<{ responseId?: string; error?: string }> {
  try {
    const ip = await clientIp();
    // Up to 30 new responses per IP per hour.
    await assertWithinRateLimit(`survey-start:${ip}`, { limit: 30, windowMs: 3_600_000 });
    const { responseId } = await startResponse({ slug, consent });
    return { responseId };
  } catch (e) {
    if (e instanceof RateLimitExceededError) return { error: 'Too many attempts — please try again later.' };
    return { error: e instanceof SurveyError ? e.message : 'Could not start the survey.' };
  }
}

/** Stream answers to an in-progress response (partial-save) / mark complete. */
export async function patchResponseAction(
  responseId: string,
  data: { answers: Answers; complete: boolean },
): Promise<{ error?: string }> {
  try {
    const ip = await clientIp();
    // Generous — this is called on every answer while filling in.
    await assertWithinRateLimit(`survey-patch:${ip}`, { limit: 600, windowMs: 600_000 });
    await patchResponse({ responseId, answers: data.answers, complete: data.complete });
    return {};
  } catch (e) {
    if (e instanceof RateLimitExceededError) return { error: 'Too many requests — slow down a moment.' };
    return { error: 'Could not save your response.' };
  }
}
