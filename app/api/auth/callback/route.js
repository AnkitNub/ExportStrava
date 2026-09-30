import { NextResponse } from 'next/server';
import { appOrigin } from '@/lib/config';
import { SESSION_COOKIE, STATE_COOKIE, cookieOptions, encodeSession } from '@/lib/session';
import { exchangeCode, hasActivityScope } from '@/lib/strava';

/** Strava redirects here after the athlete approves (or declines) access. */
export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const origin = appOrigin(request);

  const backHome = (error) => {
    const url = new URL('/', origin);
    if (error) url.searchParams.set('error', error);
    const response = NextResponse.redirect(url);
    response.cookies.delete(STATE_COOKIE);
    return response;
  };

  if (searchParams.get('error')) return backHome('denied');

  const state = searchParams.get('state');
  if (!state || state !== request.cookies.get(STATE_COOKIE)?.value) return backHome('state');

  if (!hasActivityScope(searchParams.get('scope'))) return backHome('scope');

  let session;
  try {
    session = await exchangeCode(searchParams.get('code'));
  } catch (err) {
    console.error('Strava token exchange failed', err);
    return backHome('exchange');
  }

  const response = backHome();
  response.cookies.set(SESSION_COOKIE, encodeSession(session), cookieOptions());
  return response;
}
