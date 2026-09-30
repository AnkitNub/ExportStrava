const MIN_SECRET_LENGTH = 32;

/** Names of required environment variables that are missing or invalid. */
export function missingConfig() {
  const missing = [];
  if (!process.env.STRAVA_CLIENT_ID) missing.push('STRAVA_CLIENT_ID');
  if (!process.env.STRAVA_CLIENT_SECRET) missing.push('STRAVA_CLIENT_SECRET');
  if ((process.env.SESSION_SECRET ?? '').length < MIN_SECRET_LENGTH) missing.push('SESSION_SECRET');
  return missing;
}

/**
 * Public origin of the app. APP_URL wins when set (needed behind a proxy);
 * otherwise the request's own origin is used, which keeps cookies and the
 * OAuth redirect on the same host the user actually opened.
 */
export function appOrigin(request) {
  return process.env.APP_URL?.replace(/\/+$/, '') || request.nextUrl.origin;
}
