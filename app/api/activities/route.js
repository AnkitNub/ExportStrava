import { NextResponse } from 'next/server';
import { SESSION_COOKIE, cookieOptions, decodeSession, encodeSession } from '@/lib/session';
import { StravaError, listActivities, needsRefresh, refreshSession } from '@/lib/strava';

function epochParam(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/** GET /api/activities?after=<epoch>&before=<epoch> — the signed-in athlete's activities in that window. */
export async function GET(request) {
  let session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: 'You’re not connected to Strava.' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const range = {
    after: epochParam(searchParams.get('after')),
    before: epochParam(searchParams.get('before')),
  };

  let refreshed = false;
  let response;
  try {
    if (needsRefresh(session)) {
      session = await refreshSession(session);
      refreshed = true;
    }
    const activities = await listActivities(session.accessToken, range);
    response = NextResponse.json({ activities });
  } catch (err) {
    response = errorResponse(err);
    if (response.status === 401) {
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
  }

  // Strava invalidates the old refresh token once a new one is issued, so the
  // new one must reach the browser even when the activity fetch that followed failed.
  if (refreshed) {
    response.cookies.set(SESSION_COOKIE, encodeSession(session), cookieOptions());
  }
  return response;
}

function errorResponse(err) {
  const status = err instanceof StravaError ? err.status : 0;

  if (status === 401) {
    return NextResponse.json(
      { error: 'Your Strava connection has expired. Connect again to continue.' },
      { status: 401 },
    );
  }
  if (status === 429) {
    return NextResponse.json(
      { error: 'Strava’s rate limit was reached. Wait about 15 minutes, then try again.' },
      { status: 429 },
    );
  }

  console.error('Fetching Strava activities failed', err);
  return NextResponse.json(
    { error: 'Strava didn’t respond. Try again in a moment.' },
    { status: 502 },
  );
}
