import 'server-only';
import { randomBytes, createHash } from 'node:crypto';

/**
 * Shared token pattern for password resets, email verification, and
 * invitations: only the hash is ever persisted — the raw value is returned
 * once, at creation, for the caller to email or display, and cannot be
 * recovered afterward.
 */
export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
