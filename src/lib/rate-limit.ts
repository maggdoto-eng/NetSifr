import 'server-only';
import { prisma } from '@/lib/prisma';

/**
 * Fixed-window, DB-backed rate limiter — appropriate for a single-instance
 * deployment (see docs/plan.md). Backs login/password-reset/invitation/
 * heartbeat limits.
 */
export class RateLimitExceededError extends Error {
  constructor(key: string) {
    super(`Rate limit exceeded for "${key}"`);
    this.name = 'RateLimitExceededError';
  }
}

export async function assertWithinRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<void> {
  const windowStart = new Date(Math.floor(Date.now() / opts.windowMs) * opts.windowMs);

  const bucket = await prisma.rateLimitBucket.upsert({
    where: { key_windowStart: { key, windowStart } },
    update: { count: { increment: 1 } },
    create: { key, windowStart, count: 1 },
  });

  if (bucket.count > opts.limit) {
    throw new RateLimitExceededError(key);
  }
}
