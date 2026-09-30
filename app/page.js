import { cookies } from 'next/headers';
import ConnectCard from '@/components/connect-card';
import Exporter from '@/components/exporter';
import SetupCard from '@/components/setup-card';
import { missingConfig } from '@/lib/config';
import { SESSION_COOKIE, decodeSession } from '@/lib/session';

const ERRORS = {
  denied: 'You cancelled the Strava connection. Connect again whenever you’re ready.',
  scope:
    'Strava didn’t share your activities. Connect again and leave the activity permissions ticked on Strava’s approval screen.',
  state: 'That sign-in link expired or was opened in a different browser. Try connecting again.',
  exchange: 'Strava couldn’t finish signing you in. Try again in a moment.',
  config: 'The app is missing its Strava settings. Follow the setup steps below.',
};

export default async function Home({ searchParams }) {
  const { error } = await searchParams;
  const missing = missingConfig();
  const session = missing.length
    ? null
    : decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  const athlete = session?.athlete;
  const athleteName = athlete ? `${athlete.firstname} ${athlete.lastname}`.trim() : '';

  return (
    <>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-brand text-white" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Strava Data Export</span>
          </div>

          {athlete && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                {athlete.profile ? (
                  // Strava avatars come from several CDNs; next/image would need each one allow-listed.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={athlete.profile} alt="" className="size-8 rounded-full object-cover" />
                ) : (
                  <span className="grid size-8 place-items-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600" aria-hidden="true">
                    {(athlete.firstname?.[0] ?? '') + (athlete.lastname?.[0] ?? '')}
                  </span>
                )}
                <span className="hidden text-sm font-medium sm:inline">{athleteName}</span>
              </div>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {ERRORS[error] && (
          <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {ERRORS[error]}
          </div>
        )}

        {missing.length ? (
          <SetupCard missing={missing} />
        ) : athlete ? (
          <Exporter athleteName={athleteName} />
        ) : (
          <ConnectCard />
        )}
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-zinc-500 sm:flex-row sm:justify-between sm:px-6">
          <span>Powered by Strava</span>
          <span>Not affiliated with or endorsed by Strava, Inc.</span>
        </div>
      </footer>
    </>
  );
}
