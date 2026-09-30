# Strava Data Export

Connect a Strava account, pick a date range, and download your activities as a PDF report.

The report includes:

- **Totals** for the period: activity count, distance, moving time, elevation gain
- **By sport**: the same totals for each sport
- **All activities**: one row per activity, each name linking back to Strava
- **Route cards** (optional): one card per activity with its route drawn from GPS data plus detailed stats (pace or speed, heart rate, power, energy, kudos), three per page

You can hide whole sports, untick individual activities, switch between kilometres and miles, and set the report title before downloading.

## Setup

1. **Create a Strava API app** at [strava.com/settings/api](https://www.strava.com/settings/api).
   - Any name, category and website will do.
   - Set **Authorization Callback Domain** to `localhost`.
2. **Add the credentials.** `.env.local` already has a generated `SESSION_SECRET`. Fill in `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` from the app page. See `.env.example` for what each variable does.
3. **Run it:**

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and click **Connect with Strava**.

New Strava API apps have an athlete capacity of 1: only the app owner can connect. That's fine for personal use. To let other people connect, request a higher limit from Strava.

## How it works

```
Browser ──► /api/auth/strava ──► Strava consent ──► /api/auth/callback
                                                         │ exchanges the code for tokens
                                                         ▼
                                     encrypted httpOnly cookie (AES-256-GCM)
Browser ──► /api/activities?after=&before= ──► Strava API (paged 200 at a time)
   │
   └─► builds the PDF locally with jsPDF (lib/pdf.js)
```

- **No database.** Strava tokens are kept in an encrypted, httpOnly cookie, and access tokens are refreshed automatically when they're about to expire.
- **The PDF is built in the browser**, so activity data isn't stored anywhere.
- The app requests the `activity:read_all` scope, so private ("Only you") activities are included too.
- **Sign out** clears the cookie. To fully revoke the app's access, go to [strava.com/settings/apps](https://www.strava.com/settings/apps).

| Path | Purpose |
| --- | --- |
| `app/page.js` | Shows the setup, connect or exporter screen |
| `components/exporter.js` | Date range, filters, activity list, export options |
| `app/api/auth/*` | OAuth start, callback and sign-out |
| `app/api/activities/route.js` | Fetches activities and refreshes tokens |
| `lib/strava.js` | Strava OAuth and API client |
| `lib/session.js` | Cookie encryption |
| `lib/pdf.js` | PDF layout |
| `lib/format.js` | Units, pace and speed, dates, totals |

## Limitations

- The PDF uses the built-in Helvetica font, which only covers Latin characters. Emoji and non-Latin scripts in activity names are dropped from the PDF. If nothing is left, the name falls back to something like "Run activity". The web page shows names unchanged.
- Route cards show the route's shape only, with no map tiles underneath.
- Strava's default rate limit is about 100 requests per 15 minutes. Each request returns up to 200 activities, so even an "All time" export of several thousand activities is well within it.

## Deploying

Set the same environment variables on your host. Add `APP_URL` if the app runs behind a proxy. In your Strava app settings, change the callback domain to your deployed domain.
