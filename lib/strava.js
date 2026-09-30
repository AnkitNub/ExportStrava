const OAUTH_URL = 'https://www.strava.com/oauth';
const API_URL = 'https://www.strava.com/api/v3';

// activity:read_all includes activities marked "Only you" as well as public ones.
const SCOPES = 'read,activity:read_all';
const PER_PAGE = 200; // Strava's maximum
const MAX_PAGES = 100; // 20,000 activities; a guard against looping forever
const REFRESH_MARGIN_SECONDS = 5 * 60;

export class StravaError extends Error {
  constructor(status, body) {
    super(`Strava responded with ${status}: ${body}`);
    this.status = status;
  }
}

export function authorizeUrl({ redirectUri, state }) {
  const url = new URL(`${OAUTH_URL}/authorize`);
  url.search = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: SCOPES,
    state,
  }).toString();
  return url.toString();
}

/** Strava reports granted scopes on the callback; people can untick activity access on the consent screen. */
export function hasActivityScope(grantedScope) {
  const scopes = (grantedScope ?? '').split(',');
  return scopes.includes('activity:read_all') || scopes.includes('activity:read');
}

async function tokenRequest(params) {
  const res = await fetch(`${OAUTH_URL}/token`, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      ...params,
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new StravaError(res.status, await res.text());
  return res.json();
}

export async function exchangeCode(code) {
  const token = await tokenRequest({ code, grant_type: 'authorization_code' });
  const { athlete } = token;
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: token.expires_at,
    athlete: {
      id: athlete.id,
      firstname: athlete.firstname,
      lastname: athlete.lastname,
      // Strava sends a relative placeholder path when there's no photo.
      profile: athlete.profile_medium?.startsWith('http') ? athlete.profile_medium : null,
    },
  };
}

export function needsRefresh(session) {
  return session.expiresAt - Date.now() / 1000 < REFRESH_MARGIN_SECONDS;
}

export async function refreshSession(session) {
  let token;
  try {
    token = await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    });
  } catch (err) {
    // A rejected refresh token (revoked access, rotated elsewhere) comes back as
    // 400; surface it as 401 so callers treat it like any other expired login.
    if (err instanceof StravaError && err.status === 400) throw new StravaError(401, err.message);
    throw err;
  }
  return {
    ...session,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: token.expires_at,
  };
}

/** Only the fields the UI and PDF use, to keep the payload small for long histories. */
function toActivity(a) {
  return {
    id: a.id,
    name: a.name,
    sportType: a.sport_type || a.type,
    startDate: a.start_date,
    // Local wall-clock time, formatted as ISO with a misleading "Z" suffix.
    startDateLocal: a.start_date_local,
    distance: a.distance,
    movingTime: a.moving_time,
    elapsedTime: a.elapsed_time,
    elevationGain: a.total_elevation_gain,
    maxSpeed: a.max_speed,
    averageHeartrate: a.average_heartrate ?? null,
    maxHeartrate: a.max_heartrate ?? null,
    averageWatts: a.average_watts ?? null,
    kilojoules: a.kilojoules ?? null,
    kudos: a.kudos_count ?? 0,
    trainer: Boolean(a.trainer),
    commute: Boolean(a.commute),
    manual: Boolean(a.manual),
    private: Boolean(a.private),
    polyline: a.map?.summary_polyline || null,
  };
}

/** Every activity whose start falls between `after` and `before` (epoch seconds, both optional), newest first. */
export async function listActivities(accessToken, { after, before }) {
  const activities = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
    if (after) params.set('after', String(after));
    if (before) params.set('before', String(before));

    const res = await fetch(`${API_URL}/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new StravaError(res.status, await res.text());

    const batch = await res.json();
    activities.push(...batch.map(toActivity));
    if (batch.length < PER_PAGE) break;
  }
  // Strava pages oldest-first whenever `after` is set, newest-first otherwise.
  return activities.sort((a, b) => b.startDate.localeCompare(a.startDate));
}
