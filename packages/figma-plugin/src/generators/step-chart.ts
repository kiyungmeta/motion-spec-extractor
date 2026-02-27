import type { Layer, AnimatedProperty, Keyframe, CubicBezier } from '@motion-spec/shared';
import { COLORS, TYPOGRAPHY, SPACING, RGB } from '../design-system/tokens';
import { createCard, createText, createRect, createAutoLayout, createDivider } from '../design-system/primitives';
import { formatValue, formatTime } from '../utils/value-formatter';

export function createStepChart(layer: Layer, width: number): FrameNode | null {
  const qualifyingProps = layer.animationSummary.properties.filter(p => p.keyframeCount >= 2);
  if (qualifyingProps.length === 0) return null;

  const card = createCard(width, SPACING.md, SPACING.md);
  card.name = 'Step Chart: ' + layer.name;

  const title = createText('Step Breakdown: ' + layer.name, TYPOGRAPHY.heading4, COLORS.textPrimary);
  card.appendChild(title);

  const contentWidth = width - SPACING.md * 2;

  for (const propSummary of qualifyingProps) {
    const animProp = findAnimatedProperty(layer, propSummary.name);
    if (!animProp || !animProp.keyframes || animProp.keyframes.length < 2) continue;

    const color = getPropertyColor(propSummary.name);

    // Property name header
    const propTitle = createText(propSummary.name, TYPOGRAPHY.heading4, color);
    card.appendChild(propTitle);

    // --- Visual timeline/line graph ---
    const lineGraph = createKeyframeLineGraph(animProp, contentWidth, color);
    if (lineGraph) card.appendChild(lineGraph);

    // --- Step table ---
    const table = createAutoLayout('VERTICAL', 0);
    table.counterAxisSizingMode = 'FIXED';
    table.resize(contentWidth, 10);
    table.clipsContent = false;

    // Header row
    const header = createStepRow(
      ['Step', 'Start', 'End', 'Duration', 'Value', 'Easing'],
      contentWidth, true
    );
    table.appendChild(header);

    // One row per segment between consecutive keyframes
    for (let i = 0; i < animProp.keyframes.length - 1; i++) {
      const kf = animProp.keyframes[i];
      const kfNext = animProp.keyframes[i + 1];
      const segDuration = formatTime(kfNext.time - kf.time);
      const easingStr = kf.temporalEasing
        ? kf.temporalEasing.cubicBezier.css
        : (kf.interpolationType?.outType === 'HOLD' ? 'HOLD' : 'linear');
      const valueStr = formatValue(kf.value) + ' \u2192 ' + formatValue(kfNext.value);

      const row = createStepRow(
        [
          (i + 1).toString(),
          formatTime(kf.time),
          formatTime(kfNext.time),
          segDuration,
          valueStr,
          easingStr
        ],
        contentWidth,
        false,
        i % 2 === 0
      );
      table.appendChild(row);
    }

    card.appendChild(table);
    card.appendChild(createDivider(contentWidth));
  }

  return card;
}

// ─── Line Graph ───────────────────────────────────────────────────────────────

const GRAPH_HEIGHT = 100;
const GRAPH_PADDING_TOP = 20;
const GRAPH_PADDING_BOTTOM = 24;
const GRAPH_PADDING_LEFT = 40;
const GRAPH_PADDING_RIGHT = 16;

function createKeyframeLineGraph(
  animProp: AnimatedProperty,
  width: number,
  color: RGB
): FrameNode | null {
  const kfs = animProp.keyframes;
  if (!kfs || kfs.length < 2) return null;

  // Extract scalar values for graphing
  const values = extractScalarValues(kfs);
  if (!values) return null;

  const totalHeight = GRAPH_PADDING_TOP + GRAPH_HEIGHT + GRAPH_PADDING_BOTTOM;
  const graphWidth = width - GRAPH_PADDING_LEFT - GRAPH_PADDING_RIGHT;

  const container = figma.createFrame();
  container.name = 'Keyframe Line Graph';
  container.resize(width, totalHeight);
  container.fills = [{ type: 'SOLID', color: COLORS.cardBackground }];
  container.cornerRadius = 6;
  container.strokes = [{ type: 'SOLID', color: COLORS.curveGrid }];
  container.strokeWeight = 1;

  // Time range
  const tMin = kfs[0].time;
  const tMax = kfs[kfs.length - 1].time;
  const tRange = tMax - tMin;
  if (tRange < 0.0001) return null;

  // Value range
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const vRange = vMax - vMin;
  const effectiveVMin = vRange < 0.001 ? vMin - 1 : vMin;
  const effectiveVMax = vRange < 0.001 ? vMax + 1 : vMax;
  const effectiveVRange = effectiveVMax - effectiveVMin;

  // Helper: map time → x pixel
  function toX(t: number): number {
    return GRAPH_PADDING_LEFT + ((t - tMin) / tRange) * graphWidth;
  }
  // Helper: map value → y pixel (flipped)
  function toY(v: number): number {
    return GRAPH_PADDING_TOP + GRAPH_HEIGHT - ((v - effectiveVMin) / effectiveVRange) * GRAPH_HEIGHT;
  }

  // Draw light horizontal grid lines (value axis)
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const frac = i / gridSteps;
    const gy = GRAPH_PADDING_TOP + frac * GRAPH_HEIGHT;
    const gridLine = createRect(graphWidth, 1, COLORS.curveGrid);
    gridLine.x = GRAPH_PADDING_LEFT;
    gridLine.y = gy;
    container.appendChild(gridLine);

    // Y-axis value labels
    const val = effectiveVMax - frac * effectiveVRange;
    const valLabel = createText(
      formatScalar(val),
      TYPOGRAPHY.caption,
      COLORS.textTertiary
    );
    valLabel.x = 2;
    valLabel.y = gy - 5;
    container.appendChild(valLabel);
  }

  // Draw vertical grid lines at each keyframe time + time labels
  for (let i = 0; i < kfs.length; i++) {
    const kf = kfs[i];
    const x = toX(kf.time);

    // Vertical line
    const vLine = createRect(1, GRAPH_HEIGHT, COLORS.curveGrid);
    vLine.x = x;
    vLine.y = GRAPH_PADDING_TOP;
    container.appendChild(vLine);

    // Time label at bottom
    const tLabel = createText(
      formatTime(kf.time),
      TYPOGRAPHY.caption,
      COLORS.textTertiary
    );
    tLabel.x = x - 12;
    tLabel.y = GRAPH_PADDING_TOP + GRAPH_HEIGHT + 4;
    container.appendChild(tLabel);
  }

  // Draw segments between keyframes with easing curves
  for (let i = 0; i < kfs.length - 1; i++) {
    const kf = kfs[i];
    const kfNext = kfs[i + 1];
    const isHold = kf.interpolationType && kf.interpolationType.outType === 'HOLD';

    const x0 = toX(kf.time);
    const y0 = toY(values[i]);
    const x1 = toX(kfNext.time);
    const y1 = toY(values[i + 1]);

    if (isHold) {
      // HOLD: horizontal line then vertical drop
      drawStraightLine(container, x0, y0, x1, y0, color, 2, [4, 4]);
      drawStraightLine(container, x1, y0, x1, y1, color, 1, [2, 2]);
    } else {
      const bezier = kf.temporalEasing?.cubicBezier;
      if (bezier) {
        // Draw easing-aware curve segment
        drawEasedSegment(container, x0, y0, x1, y1, bezier, color);
      } else {
        // Linear fallback
        drawStraightLine(container, x0, y0, x1, y1, color, 2);
      }
    }

    // Segment duration label centered above the segment
    const segDur = kfNext.time - kf.time;
    const midX = (x0 + x1) / 2;
    if (x1 - x0 > 40) {
      const durLabel = createText(
        formatTime(segDur),
        TYPOGRAPHY.caption,
        color
      );
      durLabel.x = midX - 12;
      durLabel.y = GRAPH_PADDING_TOP - 14;
      container.appendChild(durLabel);

      // Small bracket lines
      const bracketY = GRAPH_PADDING_TOP - 4;
      const bracketL = createRect(1, 4, color);
      bracketL.x = x0;
      bracketL.y = bracketY;
      container.appendChild(bracketL);
      const bracketR = createRect(1, 4, color);
      bracketR.x = x1;
      bracketR.y = bracketY;
      container.appendChild(bracketR);
      const bracketH = createRect(x1 - x0, 1, color);
      bracketH.x = x0;
      bracketH.y = bracketY;
      container.appendChild(bracketH);
    }
  }

  // Draw keyframe dots
  for (let i = 0; i < kfs.length; i++) {
    const x = toX(kfs[i].time);
    const y = toY(values[i]);

    // Outer ring
    const outerDot = figma.createEllipse();
    outerDot.resize(10, 10);
    outerDot.x = x - 5;
    outerDot.y = y - 5;
    outerDot.fills = [{ type: 'SOLID', color: COLORS.cardBackground }];
    outerDot.strokes = [{ type: 'SOLID', color }];
    outerDot.strokeWeight = 2;
    container.appendChild(outerDot);

    // Inner dot
    const innerDot = figma.createEllipse();
    innerDot.resize(6, 6);
    innerDot.x = x - 3;
    innerDot.y = y - 3;
    innerDot.fills = [{ type: 'SOLID', color }];
    innerDot.strokes = [];
    container.appendChild(innerDot);
  }

  return container;
}

function drawStraightLine(
  container: FrameNode,
  x1: number, y1: number,
  x2: number, y2: number,
  color: RGB,
  weight: number = 2,
  dashPattern?: number[]
): void {
  const line = figma.createVector();
  line.name = 'Line';
  line.vectorNetwork = {
    vertices: [
      { x: x1, y: y1, strokeCap: 'ROUND', strokeJoin: 'MITER', cornerRadius: 0, handleMirroring: 'NONE' },
      { x: x2, y: y2, strokeCap: 'ROUND', strokeJoin: 'MITER', cornerRadius: 0, handleMirroring: 'NONE' },
    ],
    segments: [{ start: 0, end: 1 }],
    regions: [],
  };
  line.strokes = [{ type: 'SOLID', color }];
  line.strokeWeight = weight;
  line.fills = [];
  if (dashPattern) line.dashPattern = dashPattern;
  line.x = 0;
  line.y = 0;
  container.appendChild(line);
}

function drawEasedSegment(
  container: FrameNode,
  x0: number, y0: number,
  x1: number, y1: number,
  bezier: CubicBezier,
  color: RGB
): void {
  // The cubic-bezier defines time→progress mapping.
  // We sample the curve and draw a polyline to show the actual eased path.
  const segments = 32;
  const points: { x: number; y: number }[] = [];

  for (let s = 0; s <= segments; s++) {
    const t = s / segments;
    // Use the bezier to map normalized time → normalized progress
    const progress = sampleBezierY(bezier.x1, bezier.y1, bezier.x2, bezier.y2, t);
    const px = x0 + t * (x1 - x0);
    const py = y0 + progress * (y1 - y0);
    points.push({ x: px, y: py });
  }

  if (points.length < 2) return;

  // Build a polyline using VectorNetwork
  const vec = figma.createVector();
  vec.name = 'Eased Curve';

  const vertices = points.map(p => ({
    x: p.x,
    y: p.y,
    strokeCap: 'ROUND' as const,
    strokeJoin: 'MITER' as const,
    cornerRadius: 0,
    handleMirroring: 'NONE' as const,
  }));

  const segs = [];
  for (let i = 0; i < vertices.length - 1; i++) {
    segs.push({ start: i, end: i + 1 });
  }

  vec.vectorNetwork = { vertices, segments: segs, regions: [] };
  vec.strokes = [{ type: 'SOLID', color }];
  vec.strokeWeight = 2;
  vec.fills = [];
  vec.x = 0;
  vec.y = 0;
  container.appendChild(vec);
}

// Sample a cubic-bezier's Y for a given normalized time t
// Uses Newton-Raphson to find the parameter u where bezierX(u) = t
function sampleBezierY(
  x1: number, y1: number,
  x2: number, y2: number,
  targetT: number
): number {
  // Find u such that bezierX(u) = targetT
  let u = targetT;
  for (let iter = 0; iter < 8; iter++) {
    const mt = 1 - u;
    const bx = 3 * mt * mt * u * x1 + 3 * mt * u * u * x2 + u * u * u;
    const dx = bx - targetT;
    if (Math.abs(dx) < 0.0001) break;
    // Derivative of bx w.r.t. u
    const dbx = 3 * mt * mt * x1 + 6 * mt * u * (x2 - x1) + 3 * u * u * (1 - x2);
    if (Math.abs(dbx) < 0.0001) break;
    u -= dx / dbx;
    u = Math.max(0, Math.min(1, u));
  }
  // Evaluate bezierY at u
  const mt = 1 - u;
  return 3 * mt * mt * u * y1 + 3 * mt * u * u * y2 + u * u * u;
}

// ─── Step Table ───────────────────────────────────────────────────────────────

function createStepRow(cells: string[], totalWidth: number, isHeader: boolean, isEven: boolean = true): FrameNode {
  const colWidths = [0.05, 0.10, 0.10, 0.10, 0.30, 0.35].map(p => Math.floor(totalWidth * p));

  const row = createAutoLayout('HORIZONTAL', 0);
  row.counterAxisSizingMode = 'AUTO';
  row.fills = [{ type: 'SOLID', color: isHeader ? COLORS.background : (isEven ? COLORS.cardBackground : COLORS.background) }];
  row.paddingTop = SPACING.sm;
  row.paddingBottom = SPACING.sm;

  for (let i = 0; i < cells.length; i++) {
    const cellFrame = figma.createFrame();
    cellFrame.resize(colWidths[i], 20);
    cellFrame.fills = [];
    cellFrame.layoutMode = 'VERTICAL';
    cellFrame.primaryAxisSizingMode = 'AUTO';
    cellFrame.counterAxisSizingMode = 'FIXED';
    cellFrame.paddingLeft = SPACING.sm;
    cellFrame.paddingRight = SPACING.sm;
    cellFrame.clipsContent = false;

    const style = isHeader ? TYPOGRAPHY.label : TYPOGRAPHY.codeSmall;
    const textColor = isHeader ? COLORS.textTertiary : COLORS.textPrimary;
    const textWidth = colWidths[i] - SPACING.sm * 2;
    const text = createText(cells[i], style, textColor, textWidth);
    cellFrame.appendChild(text);
    row.appendChild(cellFrame);
  }

  return row;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractScalarValues(kfs: Keyframe[]): number[] | null {
  const values: number[] = [];
  for (const kf of kfs) {
    if (typeof kf.value === 'number') {
      values.push(kf.value);
    } else if (Array.isArray(kf.value)) {
      // Use magnitude for multi-dimensional values, or find the dimension with most change
      if (kf.value.length === 1) {
        values.push(kf.value[0]);
      } else {
        // For first pass, determine which dimension has the most variation
        values.push(0); // placeholder
      }
    } else {
      return null; // Can't graph string values
    }
  }

  // If we used placeholders for array values, pick the best dimension
  if (kfs.length > 0 && Array.isArray(kfs[0].value)) {
    const dimCount = (kfs[0].value as number[]).length;
    let bestDim = 0;
    let bestRange = 0;
    for (let d = 0; d < dimCount; d++) {
      let dMin = Infinity, dMax = -Infinity;
      for (const kf of kfs) {
        const v = (kf.value as number[])[d];
        if (v < dMin) dMin = v;
        if (v > dMax) dMax = v;
      }
      if (dMax - dMin > bestRange) {
        bestRange = dMax - dMin;
        bestDim = d;
      }
    }
    for (let i = 0; i < kfs.length; i++) {
      values[i] = (kfs[i].value as number[])[bestDim];
    }
  }

  return values;
}

function formatScalar(v: number): string {
  if (Math.abs(v) >= 100) return Math.round(v).toString();
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function getPropertyColor(name: string): RGB {
  const colors = COLORS.propertyColors;
  if (colors[name]) return colors[name];

  const lower = name.toLowerCase();
  if (lower.indexOf('position') >= 0) return COLORS.accentBlue;
  if (lower.indexOf('scale') >= 0) return COLORS.accentGreen;
  if (lower.indexOf('rotation') >= 0) return COLORS.accentPurple;
  if (lower.indexOf('opacity') >= 0) return COLORS.accentOrange;

  return COLORS.textSecondary;
}

function findAnimatedProperty(layer: Layer, name: string): AnimatedProperty | null {
  const t = layer.transform;
  const all: (AnimatedProperty | undefined)[] = [t.anchorPoint, t.position, t.scale, t.rotation, t.opacity];
  if (t.positionSeparated) {
    all.push(t.positionSeparated.x, t.positionSeparated.y);
    if (t.positionSeparated.z) all.push(t.positionSeparated.z);
  }
  if (t.rotationX) all.push(t.rotationX);
  if (t.rotationY) all.push(t.rotationY);
  if (t.rotationZ) all.push(t.rotationZ);

  for (const p of all) {
    if (p && p.name === name) return p;
  }
  return null;
}
