const Code = ({ children }) => (
  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-800">{children}</code>
);

export default function SetupCard({ missing }) {
  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Finish setting up</h1>
      <p className="mt-2 text-sm text-zinc-600">
        To talk to Strava, the app needs its own API credentials. This takes about two minutes.
      </p>

      <ol className="mt-6 list-decimal space-y-4 pl-5 text-sm text-zinc-700 marker:font-semibold marker:text-zinc-400">
        <li>
          Go to{' '}
          <a
            href="https://www.strava.com/settings/api"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-strong underline underline-offset-2 hover:text-brand-hover"
          >
            strava.com/settings/api
          </a>{' '}
          and create an app. Any name and website will do. Set <strong>Authorization Callback Domain</strong> to{' '}
          <Code>localhost</Code>.
        </li>
        <li>
          Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> into <Code>.env.local</Code> in the project folder.
        </li>
        <li>
          Restart the dev server (<Code>npm run dev</Code>) and reload this page.
        </li>
      </ol>

      <div className="mt-6 rounded-lg bg-zinc-50 px-4 py-3 text-sm">
        <p className="font-medium text-zinc-800">Still missing</p>
        <ul className="mt-1.5 space-y-1">
          {missing.map((name) => (
            <li key={name}>
              <Code>{name}</Code>
              {name === 'SESSION_SECRET' && (
                <span className="text-zinc-500"> (a random string of at least 32 characters)</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
