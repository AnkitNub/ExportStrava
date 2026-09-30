export const EMPTY = '—';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const UNIT_SYSTEMS = {
  metric: {
    distance: 'km',
    metresPerDistance: 1000,
    elevation: 'm',
    metresPerElevation: 1,
    speed: 'km/h',
    swim: '100m',
    metresPerSwim: 100,
  },
  imperial: {
    distance: 'mi',
    metresPerDistance: 1609.344,
    elevation: 'ft',
    metresPerElevation: 0.3048,
    speed: 'mph',
    swim: '100yd',
    metresPerSwim: 91.44,
  },
};

// Foot sports read as pace (min per km/mi); everything else with a distance reads as speed.
const PACE_SPORTS = new Set(['Run', 'TrailRun', 'VirtualRun', 'Walk', 'Hike', 'Snowshoe']);
const SWIM_SPORTS = new Set(['Swim']);

const SPORT_LABELS = {
  EBikeRide: 'E-Bike Ride',
  EMountainBikeRide: 'E-Mountain Bike Ride',
  HighIntensityIntervalTraining: 'HIIT',
};

export function sportLabel(sportType) {
  if (!sportType) return 'Activity';
  return SPORT_LABELS[sportType] ?? sportType.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function number(value, digits) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

const pad = (n) => String(n).padStart(2, '0');

export function formatDistance(metres, units, digits = 2) {
  if (!metres) return EMPTY;
  const u = UNIT_SYSTEMS[units];
  return `${number(metres / u.metresPerDistance, digits)} ${u.distance}`;
}

export function formatElevation(metres, units) {
  if (!metres) return EMPTY;
  const u = UNIT_SYSTEMS[units];
  return `${number(metres / u.metresPerElevation, 0)} ${u.elevation}`;
}

/** 1:02:03 or 42:10 */
export function formatClock(seconds) {
  if (!seconds) return EMPTY;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** 12h 34m — for totals, where seconds are noise. */
export function formatHours(seconds) {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${number(h, 0)}h ${m}m` : `${m}m`;
}

export function formatSpeed(metresPerSecond, units) {
  if (!metresPerSecond) return EMPTY;
  const u = UNIT_SYSTEMS[units];
  return `${number((metresPerSecond * 3600) / u.metresPerDistance, 1)} ${u.speed}`;
}

function formatPace(secondsPerUnit, unitLabel) {
  const total = Math.round(secondsPerUnit);
  return `${Math.floor(total / 60)}:${pad(total % 60)} /${unitLabel}`;
}

export function paceLabel(sportType) {
  return PACE_SPORTS.has(sportType) || SWIM_SPORTS.has(sportType) ? 'Pace' : 'Avg speed';
}

export function formatPaceOrSpeed({ distance, movingTime, sportType }, units) {
  if (!distance || !movingTime) return EMPTY;
  const u = UNIT_SYSTEMS[units];
  if (SWIM_SPORTS.has(sportType)) return formatPace(movingTime / (distance / u.metresPerSwim), u.swim);
  if (PACE_SPORTS.has(sportType)) return formatPace(movingTime / (distance / u.metresPerDistance), u.distance);
  return formatSpeed(distance / movingTime, units);
}

export function formatHeartRate(bpm) {
  return bpm ? `${Math.round(bpm)} bpm` : EMPTY;
}

// Strava's start_date_local is wall-clock time dressed up as UTC ("…T06:32:10Z").
// Reading the digits directly keeps it in the athlete's local time whatever
// timezone the viewer's browser is in. Also accepts plain YYYY-MM-DD.
function dateParts(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

/** 14 Sep 2026 */
export function formatDay(iso) {
  if (!iso) return EMPTY;
  const { y, m, d } = dateParts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatWeekday(iso) {
  const { y, m, d } = dateParts(iso);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** 06:32 */
export function formatTimeOfDay(iso) {
  return iso.slice(11, 16);
}

/** Today in the viewer's timezone as YYYY-MM-DD. */
export function todayIso(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function activityUrl(id) {
  return `https://www.strava.com/activities/${id}`;
}

function emptyTotals() {
  return { count: 0, distance: 0, movingTime: 0, elevationGain: 0 };
}

function addTo(totals, activity) {
  totals.count += 1;
  totals.distance += activity.distance || 0;
  totals.movingTime += activity.movingTime || 0;
  totals.elevationGain += activity.elevationGain || 0;
}

/** Overall totals plus a per-sport breakdown, most frequent sport first. */
export function summarize(activities) {
  const totals = emptyTotals();
  const bySport = new Map();
  for (const activity of activities) {
    addTo(totals, activity);
    if (!bySport.has(activity.sportType)) {
      bySport.set(activity.sportType, { sportType: activity.sportType, ...emptyTotals() });
    }
    addTo(bySport.get(activity.sportType), activity);
  }
  const sports = [...bySport.values()].sort(
    (a, b) => b.count - a.count || b.movingTime - a.movingTime,
  );
  return { totals, bySport: sports };
}
