/**
 * auth/password.ts
 *
 * Password hashing WITHOUT external dependencies.
 *
 * We use Node's built-in `crypto.scrypt`.
 *
 * Stored format (string):
 *   scrypt$<saltB64>$<hashB64>
 */

import crypto from 'node:crypto';

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain, salt, 32);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const salt = Buffer.from(parts[1]!, 'base64');
  const expected = Buffer.from(parts[2]!, 'base64');

  const actual = crypto.scryptSync(plain, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}
