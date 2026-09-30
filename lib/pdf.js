import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import {
  EMPTY,
  activityUrl,
  formatClock,
  formatDay,
  formatDistance,
  formatElevation,
  formatHeartRate,
  formatHours,
  formatPaceOrSpeed,
  formatSpeed,
  formatTimeOfDay,
  formatWeekday,
  paceLabel,
  sportLabel,
  summarize,
  todayIso,
} from './format';
import { decodePolyline } from './polyline';
import { drawSportIcon } from './sport-icons';

// A4 portrait, in millimetres.
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const TOP = 20; // below the running header on continuation pages
const BOTTOM = PAGE_H - 16; // above the footer

const ORANGE = [252, 76, 2];
const ORANGE_SOFT = [255, 236, 226];
const INK = [24, 24, 27];
const MUTED = [113, 113, 122];
const HAIRLINE = [228, 228, 231];
const TINT = [247, 247, 248];
const GREEN = [22, 163, 74];

const CARD_H = 80;
const CARD_GAP = 6;

// jsPDF's built-in Helvetica only covers Latin-1, so anything outside it
// (emoji, other scripts) would print as garbage. Swap in the closest ASCII
// where there is one and drop the rest.
const REPLACEMENTS = {
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '-',
  '…': '...',
  '•': '-',
};

function toLatin1(char) {
  const code = char.codePointAt(0);
  if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) return char;
  if (REPLACEMENTS[char]) return REPLACEMENTS[char];
  // Letters like "ő" or "ł" may decompose to a base letter plus accents.
  return char.normalize('NFKD').replace(/[^\x20-\x7e\xa0-\xff]/g, '');
}

export function pdfText(value) {
  return Array.from(String(value ?? ''), toLatin1)
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function activityName(activity) {
  return pdfText(activity.name) || `${sportLabel(activity.sportType)} activity`;
}

/**
 * Builds the report and returns the jsPDF document; call `.save(filename)` on it.
 * `activities` are drawn in the order given.
 */
export function buildActivityPdf({ activities, athleteName, rangeText, title, units, includeDetails }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const reportTitle = pdfText(title) || 'Activity report';
  const athlete = pdfText(athleteName);
  doc.setProperties({ title: reportTitle, author: athlete, creator: 'Strava Data Export' });

  const { totals, bySport } = summarize(activities);

  let y = drawCover(doc, { title: reportTitle, athlete, rangeText: pdfText(rangeText) });
  y = drawTiles(doc, y, [
    ['Activities', totals.count.toLocaleString('en-US')],
    ['Distance', formatDistance(totals.distance, units, 1)],
    ['Moving time', formatHours(totals.movingTime)],
    ['Elevation gain', formatElevation(totals.elevationGain, units)],
  ]);

  y = heading(doc, 'By sport', y);
  autoTable(doc, {
    ...tableStyle([1, 2, 3, 4]),
    startY: y,
    head: [['Sport', 'Activities', 'Distance', 'Moving time', 'Elevation gain']],
    body: bySport.map((s) => [
      sportLabel(s.sportType),
      s.count.toLocaleString('en-US'),
      formatDistance(s.distance, units, 1),
      formatHours(s.movingTime),
      formatElevation(s.elevationGain, units),
    ]).map(cleanRow),
  });
  y = doc.lastAutoTable.finalY + 12;

  // Keyed by the row array itself: autotable hands hooks a copy with index -1
  // when a row continues onto the next page, but keeps the same `raw`.
  const activityIdByRow = new Map();
  const logRows = activities.map((a) => {
    const row = cleanRow([
      formatDay(a.startDateLocal),
      activityName(a),
      sportLabel(a.sportType),
      formatDistance(a.distance, units),
      formatClock(a.movingTime),
      formatPaceOrSpeed(a, units),
      formatElevation(a.elevationGain, units),
      formatHeartRate(a.averageHeartrate),
    ]);
    activityIdByRow.set(row, a.id);
    return row;
  });

  y = heading(doc, 'All activities', y);
  autoTable(doc, {
    ...tableStyle([3, 4, 5, 6, 7]),
    startY: y,
    head: [['Date', 'Name', 'Sport', 'Distance', 'Time', 'Pace / speed', 'Elev.', 'Avg HR']],
    body: logRows,
    columnStyles: {
      0: { cellWidth: 21 },
      2: { cellWidth: 26 },
      3: { cellWidth: 17, halign: 'right' },
      4: { cellWidth: 15, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 14, halign: 'right' },
      7: { cellWidth: 17, halign: 'right' },
    },
    // Each name links to the activity on Strava.
    didDrawCell: (data) => {
      const id = activityIdByRow.get(data.row.raw);
      if (data.section !== 'body' || data.column.index !== 1 || !id) return;
      const { x, y: cellY, width, height } = data.cell;
      doc.link(x, cellY, width, height, { url: activityUrl(id) });
    },
  });

  if (includeDetails) drawDetails(doc, activities, units);
  drawPageChrome(doc, `${reportTitle} · ${athlete}`);
  return doc;
}

const cleanRow = (row) => row.map(pdfText);

function tableStyle(rightAligned) {
  const right = new Set(rightAligned);
  return {
    theme: 'plain',
    rowPageBreak: 'avoid',
    margin: { left: MARGIN, right: MARGIN, top: TOP, bottom: PAGE_H - BOTTOM + 2 },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: INK,
      cellPadding: { top: 2.2, right: 2, bottom: 2.2, left: 2 },
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fontStyle: 'bold',
      fontSize: 7.5,
      textColor: MUTED,
      lineWidth: { bottom: 0.3 },
      lineColor: HAIRLINE,
    },
    alternateRowStyles: { fillColor: TINT },
    columnStyles: Object.fromEntries([...right].map((i) => [i, { halign: 'right' }])),
    didParseCell: (data) => {
      if (data.section === 'head' && right.has(data.column.index)) data.cell.styles.halign = 'right';
    },
  };
}

function drawCover(doc, { title, athlete, rangeText }) {
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, PAGE_W, 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(title, CONTENT_W).slice(0, 2);
  doc.text(titleLines, MARGIN, 26);
  let y = 26 + (titleLines.length - 1) * 9 + 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text([athlete, rangeText].filter(Boolean).join(' · '), MARGIN, y);
  y += 5.5;
  doc.setFontSize(9);
  doc.text(`Generated ${formatDay(todayIso())}`, MARGIN, y);
  return y + 10;
}

function drawTiles(doc, y, tiles) {
  const gap = 4;
  const w = (CONTENT_W - gap * (tiles.length - 1)) / tiles.length;
  const h = 21;
  tiles.forEach(([label, value], i) => {
    const x = MARGIN + i * (w + gap);
    doc.setFillColor(...TINT);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + 4, y + 7);

    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(pdfText(value), x + 4, y + 15.5);
  });
  return y + h + 12;
}

function heading(doc, text, y) {
  if (y > BOTTOM - 30) {
    doc.addPage();
    y = TOP + 2;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(text, MARGIN, y);
  return y + 4;
}

function drawDetails(doc, activities, units) {
  doc.addPage();
  let y = heading(doc, 'Activity details', TOP + 2) + 2;
  for (const activity of activities) {
    if (y + CARD_H > BOTTOM) {
      doc.addPage();
      y = TOP + 2;
    }
    drawCard(doc, activity, y, units);
    y += CARD_H + CARD_GAP;
  }
}

function detailStats(a, units) {
  const stats = [
    ['Distance', formatDistance(a.distance, units)],
    ['Moving time', formatClock(a.movingTime)],
    ['Elapsed time', formatClock(a.elapsedTime)],
    [paceLabel(a.sportType), formatPaceOrSpeed(a, units)],
    ['Elevation gain', formatElevation(a.elevationGain, units)],
    ['Avg heart rate', formatHeartRate(a.averageHeartrate)],
    ['Max heart rate', formatHeartRate(a.maxHeartrate)],
    ['Avg power', a.averageWatts ? `${Math.round(a.averageWatts)} W` : EMPTY],
    ['Energy', a.kilojoules ? `${Math.round(a.kilojoules).toLocaleString('en-US')} kJ` : EMPTY],
    // Max speed means little for swims or activities that don't cover distance.
    ['Max speed', a.distance && a.sportType !== 'Swim' ? formatSpeed(a.maxSpeed, units) : EMPTY],
    ['Kudos', a.kudos ? String(a.kudos) : EMPTY],
  ];
  return stats.filter(([, value]) => value !== EMPTY).slice(0, 9);
}

function drawCard(doc, a, y, units) {
  const x = MARGIN;
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, CONTENT_W, CARD_H, 2.5, 2.5, 'S');

  const mapSize = CARD_H - 10;
  drawRoute(doc, a, x + 5, y + 5, mapSize, mapSize);

  const tx = x + 5 + mapSize + 7;
  const tw = x + CONTENT_W - 6 - tx;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...ORANGE);
  doc.text(pdfText(sportLabel(a.sportType)).toUpperCase(), tx, y + 10);

  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  const nameLines = doc.splitTextToSize(activityName(a), tw).slice(0, 2);
  doc.text(nameLines, tx, y + 16.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const when = `${formatWeekday(a.startDateLocal)}, ${formatDay(a.startDateLocal)} at ${formatTimeOfDay(a.startDateLocal)}`;
  doc.text(when, tx, y + 16.5 + (nameLines.length - 1) * 5.2 + 5.5);

  // 3 x 3 grid of whichever stats this activity actually has.
  const colW = tw / 3;
  detailStats(a, units).forEach(([label, value], i) => {
    const cx = tx + (i % 3) * colW;
    const cy = y + 35 + Math.floor(i / 3) * 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), cx, cy);
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(pdfText(value), cx, cy + 5);
  });

  const flags = [
    a.private && 'Private',
    a.commute && 'Commute',
    a.trainer && 'Indoor',
    a.manual && 'Manual entry',
  ].filter(Boolean);
  const footY = y + CARD_H - 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  if (flags.length) doc.text(flags.join(' · '), tx, footY);
  doc.setTextColor(...ORANGE);
  doc.textWithLink('View on Strava', x + CONTENT_W - 6, footY, {
    url: activityUrl(a.id),
    align: 'right',
  });
}

function drawRoute(doc, activity, x, y, w, h) {
  doc.setFillColor(...TINT);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');

  const points = activity.polyline ? decodePolyline(activity.polyline) : [];
  const projected = project(points);
  if (!projected) {
    // Indoor and manual activities have no GPS track, so show what kind of activity it was instead.
    const radius = Math.min(w, h) * 0.27;
    const size = radius * 1.15;
    doc.setFillColor(...ORANGE_SOFT);
    doc.circle(x + w / 2, y + h / 2, radius, 'F');
    drawSportIcon(doc, activity, {
      x: x + (w - size) / 2,
      y: y + (h - size) / 2,
      size,
      color: ORANGE,
    });
    return;
  }

  const { xy, minX, minY, spanX, spanY } = projected;
  const pad = 6;
  const scale = Math.min((w - pad * 2) / (spanX || Infinity), (h - pad * 2) / (spanY || Infinity));
  const offX = x + (w - spanX * scale) / 2;
  const offY = y + (h - spanY * scale) / 2;
  const pts = xy.map(([px, py]) => [offX + (px - minX) * scale, offY + (py - minY) * scale]);

  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.7);
  doc.setLineCap('round');
  doc.setLineJoin('round');
  const segments = pts.slice(1).map(([px, py], i) => [px - pts[i][0], py - pts[i][1]]);
  doc.lines(segments, pts[0][0], pts[0][1], [1, 1], 'S', false);
  doc.setLineCap('butt');
  doc.setLineJoin('miter');

  const [endX, endY] = pts[pts.length - 1];
  doc.setFillColor(...INK);
  doc.circle(endX, endY, 1.2, 'F');
  doc.setFillColor(...GREEN);
  doc.circle(pts[0][0], pts[0][1], 1.2, 'F');
}

/**
 * Equirectangular projection, with longitude scaled by cos(latitude) so
 * routes keep their shape away from the equator. Null when there's nothing to draw.
 */
function project(points) {
  if (points.length < 2) return null;
  const meanLat = points.reduce((sum, [lat]) => sum + lat, 0) / points.length;
  const k = Math.cos((meanLat * Math.PI) / 180);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const xy = points.map(([lat, lng]) => {
    const px = lng * k;
    const py = -lat; // north up
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
    return [px, py];
  });

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  if (Math.max(spanX, spanY) < 1e-6) return null;
  return { xy, minX, minY, spanX, spanY };
}

function drawPageChrome(doc, headerText) {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    if (page > 1) {
      doc.text(headerText, MARGIN, 11);
      doc.setDrawColor(...HAIRLINE);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, 13.5, PAGE_W - MARGIN, 13.5);
    }
    doc.text('Powered by Strava', MARGIN, PAGE_H - 8);
    doc.text(`Page ${page} of ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  }
}
