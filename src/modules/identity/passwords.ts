import 'server-only';
import { hash, verify } from '@node-rs/argon2';

// @node-rs/argon2 defaults to Argon2id with RFC 9106 "low-memory" parameters
// (19 MiB, 2 iterations, 1 thread) — a sane normative default, so we don't
// override it.

export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPasswordHash(secretHash: string, password: string): Promise<boolean> {
  return verify(secretHash, password);
}
