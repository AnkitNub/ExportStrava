/**
 * Line icons for activities that have no GPS route, drawn straight onto the
 * PDF as vector paths so they stay sharp at any zoom.
 *
 * Each icon sits on a 24×24 grid (like Lucide/Feather) and is a list of shapes:
 *   { d: 'M… L… H… V… Q… C… Z' }  absolute SVG path commands only
 *   { circle: [cx, cy, r] }
 *   { ellipse: [cx, cy, rx, ry] }
 *   { rect: [x, y, w, h, radius?] }
 * Add `fill: true` to fill a shape instead of stroking it.
 */

const STROKE = 2; // in grid units

function rotate([x, y], degrees) {
  const a = (degrees * Math.PI) / 180;
  const dx = x - 12;
  const dy = y - 12;
  return [12 + dx * Math.cos(a) - dy * Math.sin(a), 12 + dx * Math.sin(a) + dy * Math.cos(a)];
}

const polyline = (points) =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');

// Three rotated copies of one arm-with-branches.
function snowflake() {
  const arm = [
    [[12, 2.5], [12, 21.5]],
    [[9.5, 4.8], [12, 7.3], [14.5, 4.8]],
    [[9.5, 19.2], [12, 16.7], [14.5, 19.2]],
  ];
  return [0, 60, 120].flatMap((deg) =>
    arm.map((points) => ({ d: polyline(points.map((p) => rotate(p, deg))) })),
  );
}

const WAVE = (y) => ({
  d: `M 2 ${y} Q 4.5 ${y - 2.2} 7 ${y} Q 9.5 ${y + 2.2} 12 ${y} Q 14.5 ${y - 2.2} 17 ${y} Q 19.5 ${y + 2.2} 22 ${y}`,
});

const ICONS = {
  run: [
    { circle: [16, 4, 2.1], fill: true },
    { d: 'M 14 8 L 11 13.5' },
    { d: 'M 8 11 L 10.5 8.5 L 14 8 L 17 10.5 L 19.5 9.5' },
    { d: 'M 11 13.5 L 15 15.5 L 14 20.5' },
    { d: 'M 11 13.5 L 8.5 17 L 4.5 17.5' },
  ],
  walk: [
    { circle: [13, 3.8, 2.1], fill: true },
    { d: 'M 12 7.8 L 11 13.5' },
    { d: 'M 8.3 13.5 L 9.3 10.6 L 12 7.8 L 14.3 10.3 L 16.6 11' },
    { d: 'M 11 13.5 L 13.3 17.2 L 13.8 21 L 15.8 21' },
    { d: 'M 11 13.5 L 9.6 17.5 L 6.8 20.6' },
  ],
  mountain: [
    { d: 'M 2.5 20 L 9.5 8.5 L 13 14 L 15.5 10.5 L 21.5 20 Z' },
    { circle: [18, 4.5, 1.8], fill: true },
  ],
  ride: [
    { circle: [5.5, 16, 3.6] },
    { circle: [18.5, 16, 3.6] },
    { d: 'M 5.5 16 L 11.5 16 L 9.5 8.5 Z' },
    { d: 'M 9.5 8.5 L 16 9.5 L 11.5 16' },
    { d: 'M 16 9.5 L 18.5 16' },
    { d: 'M 16 9.5 L 15 6.5 L 17.5 6.5' },
    { d: 'M 8 8.5 L 11 8.5' },
  ],
  swim: [
    { circle: [17.5, 6.5, 2.1], fill: true },
    { d: 'M 4 12 L 9.5 8.5 L 14 11.5' },
    WAVE(15.5),
    WAVE(20.5),
  ],
  water: [
    { d: 'M 12 3 L 12 13' },
    { d: 'M 12 4 L 18.5 12 L 12 12 Z' },
    { d: 'M 3.5 14.5 L 20.5 14.5 L 17.5 18 L 6.5 18 Z' },
    WAVE(21.5),
  ],
  winter: snowflake(),
  strength: [
    { d: 'M 7 12 L 17 12' },
    { rect: [3.5, 6.5, 4, 11], fill: true },
    { rect: [16.5, 6.5, 4, 11], fill: true },
    { d: 'M 2 10 L 2 14' },
    { d: 'M 22 10 L 22 14' },
  ],
  yoga: [
    { circle: [12, 4.5, 2.1], fill: true },
    { d: 'M 12 8.5 L 12 14' },
    { d: 'M 5 13.5 L 8.5 12.5 L 12 9.5 L 15.5 12.5 L 19 13.5' },
    { d: 'M 4.5 18.5 Q 12 12.5 19.5 18.5' },
    { d: 'M 6 20.5 L 18 20.5' },
  ],
  workout: [
    { circle: [12, 13.5, 7.5] },
    { d: 'M 12 13.5 L 15 10.5' },
    { d: 'M 10 2.5 L 14 2.5' },
    { d: 'M 12 2.5 L 12 6' },
    { d: 'M 18.5 6 L 20 4.5' },
  ],
  racket: [
    { ellipse: [13.5, 8.5, 5, 6] },
    { d: 'M 13.5 14.5 L 13.5 21.5' },
    { d: 'M 13.5 4 L 13.5 13' },
    { d: 'M 9.5 8.5 L 17.5 8.5' },
    { circle: [5.5, 18.5, 2], fill: true },
  ],
  badminton: [
    // shuttlecock: feather skirt opening upwards from a solid cork
    { d: 'M 9.2 15.5 L 4.5 3' },
    { d: 'M 14.8 15.5 L 19.5 3' },
    { d: 'M 4.5 3 Q 12 5.5 19.5 3' },
    { d: 'M 12 15.5 L 12 4.6' },
    { d: 'M 7 9.8 Q 12 11.4 17 9.8' },
    { d: 'M 8.5 16 L 15.5 16 Q 15.5 22 12 22 Q 8.5 22 8.5 16 Z', fill: true },
  ],
  pickleball: [
    // solid paddle and a ball with holes
    { rect: [3, 2.5, 11, 12.5, 4], fill: true },
    { d: 'M 8.5 14 L 8.5 21.5' },
    { circle: [18, 17.5, 4] },
    { circle: [16.9, 16.4, 0.75], fill: true },
    { circle: [19.1, 16.4, 0.75], fill: true },
    { circle: [18, 18.9, 0.75], fill: true },
  ],
  elliptical: [
    // side view: flywheel, pedal rail, swinging handle, console post, floor
    { circle: [6, 15.5, 3.5] },
    { d: 'M 6 15.5 L 15.5 17.5' },
    { d: 'M 8.5 13.2 L 12.5 14' },
    { d: 'M 15.5 17.5 L 13.5 3.5 L 11 3' },
    { d: 'M 19 21 L 18 11.5 L 20.5 10' },
    { d: 'M 2.5 21 L 21.5 21' },
  ],
  ball: [
    { circle: [12, 12, 9] },
    { d: 'M 3 12 L 21 12' },
    { d: 'M 12 3 L 12 21' },
    { d: 'M 5.5 5.5 Q 10 12 5.5 18.5' },
    { d: 'M 18.5 5.5 Q 14 12 18.5 18.5' },
  ],
  golf: [
    { d: 'M 8 21 L 8 3' },
    { d: 'M 8 3.5 L 18 7 L 8 10.5 Z', fill: true },
    { d: 'M 3.5 21 L 14 21' },
  ],
  skate: [
    { d: 'M 2.5 13.5 Q 3 16 5.5 16 L 18.5 16 Q 21 16 21.5 13.5' },
    { circle: [7, 19.5, 1.8], fill: true },
    { circle: [17, 19.5, 1.8], fill: true },
  ],
  activity: [{ d: 'M 2 12 L 6 12 L 9 5 L 14 19 L 17 12 L 22 12' }],
};

const ICON_BY_SPORT = {
  Run: 'run',
  TrailRun: 'run',
  VirtualRun: 'run',
  Walk: 'walk',
  Hike: 'mountain',
  RockClimbing: 'mountain',
  Ride: 'ride',
  MountainBikeRide: 'ride',
  GravelRide: 'ride',
  EBikeRide: 'ride',
  EMountainBikeRide: 'ride',
  VirtualRide: 'ride',
  Velomobile: 'ride',
  Handcycle: 'ride',
  Swim: 'swim',
  Rowing: 'water',
  VirtualRow: 'water',
  Kayaking: 'water',
  Canoeing: 'water',
  StandUpPaddling: 'water',
  Surfing: 'water',
  Kitesurf: 'water',
  Windsurf: 'water',
  Sail: 'water',
  AlpineSki: 'winter',
  BackcountrySki: 'winter',
  NordicSki: 'winter',
  Snowboard: 'winter',
  Snowshoe: 'winter',
  IceSkate: 'winter',
  WeightTraining: 'strength',
  Crossfit: 'strength',
  Yoga: 'yoga',
  Pilates: 'yoga',
  Workout: 'workout',
  HighIntensityIntervalTraining: 'workout',
  Elliptical: 'elliptical',
  StairStepper: 'workout',
  Tennis: 'racket',
  Badminton: 'badminton',
  Squash: 'racket',
  Pickleball: 'pickleball',
  TableTennis: 'racket',
  Racquetball: 'racket',
  Padel: 'racket',
  Soccer: 'ball',
  Basketball: 'ball',
  Volleyball: 'ball',
  Golf: 'golf',
  Skateboard: 'skate',
  InlineSkate: 'skate',
  RollerSki: 'skate',
};

// Strava files a lot under the generic "Workout", so the name is a better hint there.
const NAME_HINTS = [
  [/weight|lift|gym|strength|dumbbell|barbell|deadlift|squat|bench|kettlebell/i, 'strength'],
  [/yoga|pilates|stretch|mobility/i, 'yoga'],
];

export function iconFor({ sportType, name }) {
  const bySport = ICON_BY_SPORT[sportType];
  if (bySport && bySport !== 'workout') return bySport;
  const hint = NAME_HINTS.find(([pattern]) => pattern.test(name ?? ''));
  return hint ? hint[1] : bySport ?? 'activity';
}

// Supports M, L, H, V, Q, C and Z with absolute coordinates.
function tracePath(doc, d, ox, oy, s) {
  const tokens = d.match(/[MLHVQCZ]|-?\d*\.?\d+/g);
  let i = 0;
  let command = null;
  let cx = 0;
  let cy = 0;
  const num = () => Number(tokens[i++]);
  const X = (v) => ox + v * s;
  const Y = (v) => oy + v * s;

  while (i < tokens.length) {
    if (/[A-Z]/.test(tokens[i])) command = tokens[i++];
    switch (command) {
      case 'M':
        cx = num();
        cy = num();
        doc.moveTo(X(cx), Y(cy));
        command = 'L'; // extra pairs after M are line-tos, as in SVG
        break;
      case 'L':
        cx = num();
        cy = num();
        doc.lineTo(X(cx), Y(cy));
        break;
      case 'H':
        cx = num();
        doc.lineTo(X(cx), Y(cy));
        break;
      case 'V':
        cy = num();
        doc.lineTo(X(cx), Y(cy));
        break;
      case 'Q': {
        // Raise the quadratic to the cubic PDF understands.
        const qx = num();
        const qy = num();
        const x = num();
        const y = num();
        doc.curveTo(
          X(cx + (2 / 3) * (qx - cx)),
          Y(cy + (2 / 3) * (qy - cy)),
          X(x + (2 / 3) * (qx - x)),
          Y(y + (2 / 3) * (qy - y)),
          X(x),
          Y(y),
        );
        cx = x;
        cy = y;
        break;
      }
      case 'C': {
        const [x1, y1, x2, y2, x, y] = [num(), num(), num(), num(), num(), num()];
        doc.curveTo(X(x1), Y(y1), X(x2), Y(y2), X(x), Y(y));
        cx = x;
        cy = y;
        break;
      }
      case 'Z':
        doc.close();
        command = null;
        break;
      default:
        throw new Error(`Unsupported path command in "${d}"`);
    }
  }
}

/** Draws the activity's icon in a `size`×`size` box whose top-left corner is (x, y). */
export function drawSportIcon(doc, activity, { x, y, size, color }) {
  const s = size / 24;
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setLineWidth(STROKE * s);
  doc.setLineCap('round');
  doc.setLineJoin('round');

  for (const shape of ICONS[iconFor(activity)]) {
    const style = shape.fill ? 'F' : 'S';
    if (shape.circle) {
      const [cx, cy, r] = shape.circle;
      doc.circle(x + cx * s, y + cy * s, r * s, style);
    } else if (shape.ellipse) {
      const [cx, cy, rx, ry] = shape.ellipse;
      doc.ellipse(x + cx * s, y + cy * s, rx * s, ry * s, style);
    } else if (shape.rect) {
      const [rx, ry, w, h, radius = 0.8] = shape.rect;
      doc.roundedRect(x + rx * s, y + ry * s, w * s, h * s, radius * s, radius * s, style);
    } else {
      tracePath(doc, shape.d, x, y, s);
      if (shape.fill) doc.fill();
      else doc.stroke();
    }
  }

  doc.setLineCap('butt');
  doc.setLineJoin('miter');
}
