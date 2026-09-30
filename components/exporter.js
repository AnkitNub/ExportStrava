'use client';

import { useEffect, useMemo, useState } from 'react';
import { PRESETS, presetRange, rangeFileSlug, rangeLabel, rangeQuery } from '@/lib/date-range';
import {
  activityUrl,
  formatClock,
  formatDay,
  formatDistance,
  formatElevation,
  formatHours,
  formatPaceOrSpeed,
  sportLabel,
  summarize,
} from '@/lib/format';

const NO_ACTIVITIES = [];
const UNIT_OPTIONS = [
  ['metric', 'Kilometres'],
  ['imperial', 'Miles'],
];

const cx = (...classes) => classes.filter(Boolean).join(' ');

const CARD = 'rounded-xl border border-zinc-200 bg-white';
const FIELD =
  'h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none';
const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

async function fetchActivities(range) {
  try {
    const res = await fetch(`/api/activities?${rangeQuery(range)}`, { cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error: body.error ?? 'Couldn’t load your activities. Try again.',
        reconnect: res.status === 401,
      };
    }
    return { activities: body.activities };
  } catch {
    return { error: 'Couldn’t reach the app. Check your connection and try again.' };
  }
}

const requestKey = (applied, attempt) => `${applied.preset}|${applied.from}|${applied.to}|${attempt}`;

// Lets React paint the "Creating PDF…" state before the synchronous PDF build blocks the main thread.
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

export default function Exporter({ athleteName }) {
  // Presets resolve to real dates inside the effect, on the client only, so the
  // server render never depends on the server's clock or timezone.
  const [applied, setApplied] = useState({ preset: 'thisYear', from: null, to: null });
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);

  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState({ from: '', to: '' });
  const [draftError, setDraftError] = useState(null);

  const [hiddenSports, setHiddenSports] = useState(() => new Set());
  const [excluded, setExcluded] = useState(() => new Set());

  const [title, setTitle] = useState('Activity report');
  const [units, setUnits] = useState('metric');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const loading = result?.key !== requestKey(applied, attempt);

  useEffect(() => {
    let cancelled = false;
    const range =
      applied.preset === 'custom' ? { from: applied.from, to: applied.to } : presetRange(applied.preset);
    fetchActivities(range).then((outcome) => {
      if (!cancelled) setResult({ key: requestKey(applied, attempt), range, ...outcome });
    });
    return () => {
      cancelled = true;
    };
  }, [applied, attempt]);

  const activities = !loading && result.activities ? result.activities : NO_ACTIVITIES;
  const sports = useMemo(() => summarize(activities).bySport, [activities]);
  const visible = useMemo(
    () => activities.filter((a) => !hiddenSports.has(a.sportType)),
    [activities, hiddenSports],
  );
  const selected = useMemo(() => visible.filter((a) => !excluded.has(a.id)), [visible, excluded]);
  const totals = useMemo(() => summarize(selected).totals, [selected]);
  const allSelected = visible.length > 0 && selected.length === visible.length;
  const someSelected = selected.length > 0 && !allSelected;
  const activePreset = customOpen ? 'custom' : applied.preset;

  function choosePreset(id) {
    if (id === 'custom') {
      setCustomOpen(true);
      if (!draft.from || !draft.to) setDraft(presetRange('last30'));
      return;
    }
    setCustomOpen(false);
    setDraftError(null);
    setApplied((prev) => (prev.preset === id ? prev : { preset: id, from: null, to: null }));
  }

  function applyCustom(event) {
    event.preventDefault();
    if (!draft.from || !draft.to) return setDraftError('Choose both a start date and an end date.');
    if (draft.from > draft.to) return setDraftError('The start date needs to be on or before the end date.');
    setDraftError(null);
    setApplied((prev) =>
      prev.preset === 'custom' && prev.from === draft.from && prev.to === draft.to
        ? prev
        : { preset: 'custom', ...draft },
    );
  }

  const toggleIn = (set, value) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  function toggleAllVisible() {
    setExcluded((prev) => {
      const next = new Set(prev);
      for (const a of visible) {
        if (allSelected) next.add(a.id);
        else next.delete(a.id);
      }
      return next;
    });
  }

  async function downloadPdf() {
    setExporting(true);
    setExportError(null);
    try {
      const { buildActivityPdf } = await import('@/lib/pdf');
      await nextFrame();
      const doc = buildActivityPdf({
        activities: selected,
        athleteName,
        rangeText: rangeLabel(result.range),
        title,
        units,
        includeDetails,
      });
      doc.save(`strava-activities-${rangeFileSlug(result.range)}.pdf`);
    } catch (err) {
      console.error(err);
      setExportError('Couldn’t create the PDF. Try again, or turn off route cards for a very large export.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Export your activities</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Choose a date range, untick anything you want to leave out, then download your PDF.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* Date range */}
        <section className={cx(CARD, 'p-5 sm:p-6 lg:col-start-1')} aria-labelledby="range-heading">
          <h2 id="range-heading" className="text-base font-semibold">
            Date range
          </h2>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Date range presets">
            {PRESETS.map((preset) => {
              const active = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choosePreset(preset.id)}
                  className={cx(
                    'h-9 rounded-full border px-3.5 text-sm font-medium transition-colors',
                    FOCUS_RING,
                    active
                      ? 'border-brand bg-brand-soft text-brand-hover'
                      : 'border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50',
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {customOpen && (
            <form onSubmit={applyCustom} className="mt-4 flex flex-wrap items-end gap-3" noValidate>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-zinc-700">From</span>
                <input
                  type="date"
                  value={draft.from}
                  onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                  className={FIELD}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-zinc-700">To</span>
                <input
                  type="date"
                  value={draft.to}
                  onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                  className={FIELD}
                />
              </label>
              <button
                type="submit"
                className={cx(
                  'h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700',
                  FOCUS_RING,
                )}
              >
                Show activities
              </button>
              {draftError && (
                <p role="alert" className="w-full text-sm text-red-700">
                  {draftError}
                </p>
              )}
            </form>
          )}
        </section>

        {/* Export options */}
        <aside
          className={cx(CARD, 'p-5 sm:p-6 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1')}
          aria-labelledby="export-heading"
        >
          <h2 id="export-heading" className="text-base font-semibold">
            PDF options
          </h2>

          <div className="mt-4 space-y-5">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-700">Report title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                className={FIELD}
              />
            </label>

            <fieldset>
              <legend className="text-sm font-medium text-zinc-700">Units</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1">
                {UNIT_OPTIONS.map(([value, label]) => (
                  <label
                    key={value}
                    className={cx(
                      'cursor-pointer rounded-md py-1.5 text-center text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-brand',
                      units === value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900',
                    )}
                  >
                    <input
                      type="radio"
                      name="units"
                      value={value}
                      checked={units === value}
                      onChange={() => setUnits(value)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="flex cursor-pointer gap-3">
              <input
                type="checkbox"
                checked={includeDetails}
                onChange={(e) => setIncludeDetails(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-brand-strong"
              />
              <span className="text-sm">
                <span className="font-medium text-zinc-800">Include route cards</span>
                <span className="mt-0.5 block text-zinc-500">
                  A card for each activity with its route map and detailed stats, three per page.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-5">
            <p className="text-sm text-zinc-600" aria-live="polite">
              {loading
                ? 'Loading activities…'
                : `${selected.length.toLocaleString()} of ${activities.length.toLocaleString()} activities selected`}
            </p>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={loading || exporting || selected.length === 0}
              className={cx(
                'mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-strong text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500',
                FOCUS_RING,
              )}
            >
              {exporting && <Spinner />}
              {exporting ? 'Creating PDF…' : 'Download PDF'}
            </button>
            {exportError && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {exportError}
              </p>
            )}
          </div>
        </aside>

        {/* Activities */}
        <section className={cx(CARD, 'min-w-0 lg:col-start-1')} aria-labelledby="activities-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-5 sm:px-6 sm:pt-6">
            <h2 id="activities-heading" className="text-base font-semibold">
              Activities
            </h2>
            {!loading && result.range && (
              <span className="text-sm text-zinc-500">{rangeLabel(result.range)}</span>
            )}
          </div>

          {loading ? (
            <LoadingRows />
          ) : result.error ? (
            <div className="px-5 pt-4 pb-6 sm:px-6">
              <p role="alert" className="text-sm text-red-700">
                {result.error}
              </p>
              {result.reconnect ? (
                <a
                  href="/api/auth/strava"
                  className={cx(
                    'mt-3 inline-flex h-9 items-center rounded-md bg-brand-strong px-4 text-sm font-medium text-white hover:bg-brand-hover',
                    FOCUS_RING,
                  )}
                >
                  Connect with Strava
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setAttempt((n) => n + 1)}
                  className={cx(
                    'mt-3 h-9 rounded-md border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50',
                    FOCUS_RING,
                  )}
                >
                  Try again
                </button>
              )}
            </div>
          ) : activities.length === 0 ? (
            <p className="px-5 pt-4 pb-6 text-sm text-zinc-600 sm:px-6">
              No activities in this date range. Try a longer one, such as <strong>All time</strong>.
            </p>
          ) : (
            <>
              <dl className="mx-5 mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-zinc-200 sm:mx-6 sm:grid-cols-4">
                <Stat label="Activities" value={totals.count.toLocaleString()} />
                <Stat label="Distance" value={formatDistance(totals.distance, units, 1)} />
                <Stat label="Moving time" value={formatHours(totals.movingTime)} />
                <Stat label="Elevation" value={formatElevation(totals.elevationGain, units)} />
              </dl>

              <div className="px-5 pt-5 sm:px-6">
                <p className="text-xs text-zinc-500">Sports: select one to hide or show it.</p>
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Sports to include">
                  {sports.map((sport) => {
                    const shown = !hiddenSports.has(sport.sportType);
                    return (
                      <button
                        key={sport.sportType}
                        type="button"
                        aria-pressed={shown}
                        onClick={() => setHiddenSports((prev) => toggleIn(prev, sport.sportType))}
                        className={cx(
                          'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                          FOCUS_RING,
                          shown
                            ? 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-700'
                            : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300',
                        )}
                      >
                        {sportLabel(sport.sportType)}
                        <span className="tabular-nums opacity-60">{sport.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {visible.length === 0 ? (
                <p className="px-5 pt-5 pb-6 text-sm text-zinc-600 sm:px-6">
                  Every sport is hidden. Select a sport above to show its activities.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-y border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-500">
                      <tr>
                        <th scope="col" className="w-10 py-2.5 pr-2 pl-5 sm:pl-6">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someSelected;
                            }}
                            onChange={toggleAllVisible}
                            aria-label="Select all shown activities"
                            className="size-4 accent-brand-strong"
                          />
                        </th>
                        <th scope="col" className="py-2.5 pr-3 font-medium">Activity</th>
                        <th scope="col" className="py-2.5 pr-5 text-right font-medium sm:pr-3">Distance</th>
                        <th scope="col" className="hidden py-2.5 pr-3 text-right font-medium sm:table-cell">Time</th>
                        <th scope="col" className="hidden py-2.5 pr-3 text-right font-medium md:table-cell">Pace / speed</th>
                        <th scope="col" className="hidden py-2.5 pr-6 text-right font-medium md:table-cell">Elev.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {visible.map((a) => {
                        const included = !excluded.has(a.id);
                        return (
                          <tr key={a.id} className={included ? undefined : 'text-zinc-400'}>
                            <td className="py-2.5 pr-2 pl-5 align-top sm:pl-6">
                              <input
                                type="checkbox"
                                checked={included}
                                onChange={() => setExcluded((prev) => toggleIn(prev, a.id))}
                                aria-label={`Include ${a.name}`}
                                className="mt-0.5 size-4 accent-brand-strong"
                              />
                            </td>
                            <td className="py-2.5 pr-3">
                              <a
                                href={activityUrl(a.id)}
                                target="_blank"
                                rel="noreferrer"
                                className={cx('font-medium break-words hover:underline', included && 'text-zinc-900')}
                              >
                                {a.name}
                              </a>
                              <div className="mt-0.5 text-xs text-zinc-500">
                                {formatDay(a.startDateLocal)} · {sportLabel(a.sportType)}
                                {a.private && ' · Private'}
                              </div>
                            </td>
                            <td className="py-2.5 pr-5 text-right align-top whitespace-nowrap tabular-nums sm:pr-3">
                              {formatDistance(a.distance, units)}
                            </td>
                            <td className="hidden py-2.5 pr-3 text-right align-top whitespace-nowrap tabular-nums sm:table-cell">
                              {formatClock(a.movingTime)}
                            </td>
                            <td className="hidden py-2.5 pr-3 text-right align-top whitespace-nowrap tabular-nums md:table-cell">
                              {formatPaceOrSpeed(a, units)}
                            </td>
                            <td className="hidden py-2.5 pr-6 text-right align-top whitespace-nowrap tabular-nums md:table-cell">
                              {formatElevation(a.elevationGain, units)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="px-5 pt-4 pb-6 sm:px-6" aria-live="polite">
      <p className="text-sm text-zinc-500">Fetching your activities from Strava…</p>
      <div className="mt-4 space-y-3" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex animate-pulse items-center gap-4">
            <div className="size-4 rounded bg-zinc-200" />
            <div className="h-4 flex-1 rounded bg-zinc-200" />
            <div className="h-4 w-16 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
