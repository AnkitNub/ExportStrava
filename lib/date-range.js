import { formatDay, todayIso } from './format';

export const PRESETS = [
  { id: 'last30', label: 'Last 30 days' },
  { id: 'last90', label: 'Last 90 days' },
  { id: 'thisYear', label: 'This year' },
  { id: 'lastYear', label: 'Last year' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];

/** { from, to } as inclusive YYYY-MM-DD dates in the viewer's timezone; null means unbounded. */
export function presetRange(id, now = new Date()) {
  const year = now.getFullYear();
  const daysAgo = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return todayIso(d);
  };

  switch (id) {
    case 'last30':
      return { from: daysAgo(29), to: todayIso(now) };
    case 'last90':
      return { from: daysAgo(89), to: todayIso(now) };
    case 'thisYear':
      return { from: `${year}-01-01`, to: todayIso(now) };
    case 'lastYear':
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    default:
      return { from: null, to: null };
  }
}

function localMidnightEpoch(iso, addDays = 0) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(new Date(y, m - 1, d + addDays).getTime() / 1000);
}

/** Query string for /api/activities. `before` is the midnight after `to`, so the last day is included. */
export function rangeQuery({ from, to }) {
  const params = new URLSearchParams();
  if (from) params.set('after', String(localMidnightEpoch(from)));
  if (to) params.set('before', String(localMidnightEpoch(to, 1)));
  return params.toString();
}

export function rangeLabel({ from, to }) {
  if (from && to) return `${formatDay(from)} – ${formatDay(to)}`;
  if (from) return `Since ${formatDay(from)}`;
  if (to) return `Until ${formatDay(to)}`;
  return 'All time';
}

export function rangeFileSlug({ from, to }) {
  if (!from && !to) return 'all-time';
  return `${from ?? 'start'}_to_${to ?? todayIso()}`;
}
