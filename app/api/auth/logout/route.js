import { NextResponse } from 'next/server';
import { appOrigin } from '@/lib/config';
import { SESSION_COOKIE } from '@/lib/session';

/** Signs out of this app. The Strava authorization itself stays until revoked at strava.com/settings/apps. */
export async function POST(request) {
  // 303 so the browser follows the redirect with a GET.
  const response = NextResponse.redirect(new URL('/', appOrigin(request)), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
