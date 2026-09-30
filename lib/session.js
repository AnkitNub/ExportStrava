import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'strava_export_session';
export const STATE_COOKIE = 'strava_export_oauth_state';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// Strava refresh tokens don't expire on their own, so the cookie lifetime is
// what decides how long someone stays connected.
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function key() {
  return createHash('sha256').update(process.env.SESSION_SECRET ?? '').digest();
}

export function cookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

/**
 * Tokens live in an encrypted, httpOnly cookie rather than a database: the
 * browser can't read them and nothing is stored server-side.
 */
export function encodeSession(session) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

/** Returns the session, or null when the cookie is missing, tampered with or was sealed with another secret. */
export function decodeSession(value) {
  if (!value) return null;
  try {
    const raw = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv(ALGORITHM, key(), raw.subarray(0, IV_LENGTH));
    decipher.setAuthTag(raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH));
    const json = Buffer.concat([
      decipher.update(raw.subarray(IV_LENGTH + TAG_LENGTH)),
      decipher.final(),
    ]).toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}
