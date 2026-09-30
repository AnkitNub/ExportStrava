const FEATURES = [
  {
    title: 'Totals at a glance',
    body: 'Distance, moving time and elevation for the whole period, broken down by sport.',
  },
  {
    title: 'A full activity log',
    body: 'Every activity in one table, each linked back to Strava.',
  },
  {
    title: 'Route maps',
    body: 'An optional card for each activity with its route and key stats.',
  },
];

export default function ConnectCard() {
  return (
    <section className="mx-auto max-w-2xl py-6 text-center sm:py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Export your Strava activities as a PDF
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-base text-pretty text-zinc-600">
        Connect your Strava account, pick a date range, and download a report of everything you’ve tracked.
      </p>

      <a
        href="/api/auth/strava"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-brand-strong px-6 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Connect with Strava
      </a>
      <p className="mt-3 text-xs text-zinc-500">
        Read-only access. Nothing is saved on a server: activities are fetched when you ask, and the PDF is created in your browser.
      </p>

      <ul className="mt-12 grid gap-4 text-left sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold">{feature.title}</h2>
            <p className="mt-1.5 text-sm text-zinc-600">{feature.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
