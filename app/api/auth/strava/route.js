import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { appOrigin, missingConfig } from '@/lib/config';
import { STATE_COOKIE, cookieOptions } from '@/lib/session';
import { authorizeUrl } from '@/lib/strava';

/** Starts the Strava OAuth flow. */
export async function GET(request) {
  const origin = appOrigin(request);
  if (missingConfig().length) {
    return NextResponse.redirect(new URL('/?error=config', origin));
  }

  // The state value ties the callback to this browser, so a forged callback can't log someone in.
  const state = randomBytes(16).toString('hex');
  const response = NextResponse.redirect(
    authorizeUrl({ redirectUri: `${origin}/api/auth/callback`, state }),
  );
  response.cookies.set(STATE_COOKIE, state, cookieOptions(10 * 60));
  return response;
}
