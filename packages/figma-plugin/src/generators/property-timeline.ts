import type { Layer, AnimatedProperty, Keyframe, CubicBezier } from '@motion-spec/shared';
import { COLORS, TYPOGRAPHY, SPACING, RGB } from '../design-system/tokens';
import { createCard, createText, createRect } from '../design-system/primitives';
import { formatTime } from '../utils/value-formatter';

const LABEL_WIDTH = 120;
const ROW_HEIGHT = 56;
const BAR_HEIGHT = 24;
const HEADER_HEIGHT = 36;
const DIAMOND_SIZE = 8;

export function createPropertyTimeline(layer: Layer, width: number): FrameNode | null {
  const animProps = layer.animationSummary.properties;
  if (animProps.length === 0) return null;

  const card = createCard(width, SPACING.md, SPACING.md);
  card.name = 'Property Timeline: ' + layer.name;

  // Title
  const title = createText(
    'Property Timeline: ' + layer.name,
    TYPOGRAPHY.heading4,
    COLORS.textPrimary
  );
  card.appendChild(title);

  // Calculate time range from all keyframes in this layer
  const timeRange = getLayerTimeRange(layer);
  const displayDuration = timeRange.end - timeRange.start;

  if (displayDuration < 0.0001) return null;

  const chartWidth = width - SPACING.md * 2;
  const timelineWidth = chartWidth - LABEL_WIDTH - SPACING.sm;
  const totalHeight = HEADER_HEIGHT + animProps.length * ROW_HEIGHT;

  // Container frame (absolute positioning, no auto-layout)
  const container = figma.createFrame();
  container.name = 'Timeline Chart';
  container.resize(chartWidth, totalHeight);
  container.fills = [];
  container.clipsContent = false;
  card.appendChild(container);

  // Time ruler at top
  createTimeRuler(container, LABEL_WIDTH + SPACING.sm, timelineWidth, timeRange.start, displayDuration, HEADER_HEIGHT);

  // One row per animated property
  for (let i = 0; i < animProps.length; i++) {
    const propSummary = animProps[i];
    const animProp = findAnimatedProperty(layer, propSummary.name);
    const y = HEADER_HEIGHT + i * ROW_HEIGHT;
    const color = getPropertyColor(propSummary.name);

    // Alternating row background
    const rowBg = createRect(chartWidth, ROW_HEIGHT,
      i % 2 === 0 ? COLORS.timelineRowEven : COLORS.timelineRowOdd);
    rowBg.x = 0;
    rowBg.y = y;
    container.appendChild(rowBg);

    // Property name label
    const nameLabel = createText(
      propSummary.name,
      TYPOGRAPHY.bodySmall,
      COLORS.textPrimary
    );
    nameLabel.x = SPACING.xs;
    nameLabel.y = y + (ROW_HEIGHT - 16) / 2;
    container.appendChild(nameLabel);

    // Draw bars and easing curves between keyframes
    if (animProp && animProp.keyframes && animProp.keyframes.length >= 2) {
      const kfs = animProp.keyframes;
      const timelineX = LABEL_WIDTH + SPACING.sm;
      const barY = y + 8;

      for (let k = 0; k < kfs.length - 1; k++) {
        const kf = kfs[k];
        const kfNext = kfs[k + 1];

        const startX = timelineX + ((kf.time - timeRange.start) / displayDuration) * timelineWidth;
        const endX = timelineX + ((kfNext.time - timeRange.start) / displayDuration) * timelineWidth;
        const barW = Math.max(2, endX - startX);

        // Check if this is a HOLD keyframe (no interpolation)
        const isHold = kf.interpolationType && kf.interpolationType.outType === 'HOLD';

        if (isHold) {
          // Draw a dashed/hatched bar for HOLD
          const holdBar = createRect(barW, BAR_HEIGHT, color, 4);
          holdBar.x = startX;
          holdBar.y = barY;
          holdBar.opacity = 0.25;
          container.appendChild(holdBar);

          // Add "HOLD" label
          if (barW > 30) {
            const holdLabel = createText('HOLD', TYPOGRAPHY.caption, color);
            holdLabel.x = startX + barW / 2 - 12;
            holdLabel.y = barY + BAR_HEIGHT / 2 - 5;
            container.appendChild(holdLabel);
          }
        } else {
          // Draw the colored bar
          const bar = createRect(barW, BAR_HEIGHT, color, 4);
          bar.x = startX;
          bar.y = barY;
          bar.opacity = 0.15;
          container.appendChild(bar);

          // Draw mini easing curve inside the bar
          const bezier = kf.temporalEasing?.cubicBezier;
          if (bezier && barW > 20) {
            drawMiniEasingCurve(container, bezier, startX, barY, barW, BAR_HEIGHT, color);
          }

          // Easing label below bar (only if wide enough)
          if (bezier && barW > 60) {
            const easingLabel = createText(
              bezier.css,
              TYPOGRAPHY.caption,
              COLORS.textTertiary
            );
            easingLabel.x = startX + 2;
            easingLabel.y = barY + BAR_HEIGHT + 2;
            container.appendChild(easingLabel);
          }
        }
      }

      // Draw keyframe diamonds at each keyframe position
      for (const kf of kfs) {
        const kfX = timelineX + ((kf.time - timeRange.start) / displayDuration) * timelineWidth;
        addKeyframeDiamond(container, kfX, barY + BAR_HEIGHT / 2, color);
      }
    } else {
      // No keyframe data available, just show summary bar
      const timelineX = LABEL_WIDTH + SPACING.sm;
      const barY = y + 8;
      const startX = timelineX + ((propSummary.delay - timeRange.start) / displayDuration) * timelineWidth;
      const endX = timelineX + (((propSummary.delay + propSummary.duration) - timeRange.start) / displayDuration) * timelineWidth;
      const barW = Math.max(2, endX - startX);

      const bar = createRect(barW, BAR_HEIGHT, color, 4);
      bar.x = startX;
      bar.y = barY;
      bar.opacity = 0.3;
      container.appendChild(bar);
    }
  }

  return card;
}

function getLayerTimeRange(layer: Layer): { start: number; end: number } {
  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const prop of layer.animationSummary.properties) {
    const propStart = prop.delay;
    const propEnd = prop.delay + prop.duration;
    if (propStart < minTime) minTime = propStart;
    if (propEnd > maxTime) maxTime = propEnd;
  }

  // Also check actual keyframe times if available
  const allProps = getAllAnimatedProperties(layer);
  for (const p of allProps) {
    if (p.keyframes) {
      for (const kf of p.keyframes) {
        if (kf.time < minTime) minTime = kf.time;
        if (kf.time > maxTime) maxTime = kf.time;
      }
    }
  }

  if (minTime === Infinity) {
    return { start: 0, end: 1 };
  }

  // Add 10% padding
  const range = maxTime - minTime;
  const padding = Math.max(range * 0.1, 0.05);
  return {
    start: Math.max(0, minTime - padding),
    end: maxTime + padding,
  };
}

function createTimeRuler(
  container: FrameNode,
  startX: number,
  timelineWidth: number,
  startTime: number,
  duration: number,
  height: number
): void {
  // Adaptive tick interval
  var tickInterval: number;
  if (duration > 10) tickInterval = 2;
  else if (duration > 5) tickInterval = 1;
  else if (duration > 2) tickInterval = 0.5;
  else if (duration > 0.5) tickInterval = 0.25;
  else tickInterval = 0.1;

  // Ruler line
  const rulerLine = createRect(timelineWidth, 1, COLORS.timelineRuler);
  rulerLine.x = startX;
  rulerLine.y = height - 1;
  container.appendChild(rulerLine);

  // Round start to nearest tick
  const firstTick = Math.ceil(startTime / tickInterval) * tickInterval;

  for (var t = firstTick; t <= startTime + duration + 0.001; t += tickInterval) {
    const x = startX + ((t - startTime) / duration) * timelineWidth;

    // Tick mark
    const tick = createRect(1, 6, COLORS.timelineRuler);
    tick.x = x;
    tick.y = height - 6;
    container.appendChild(tick);

    // Time label
    const labelStr = t < 1 ? (t * 1000).toFixed(0) + 'ms' : t.toFixed(2) + 's';
    const label = createText(labelStr, TYPOGRAPHY.caption, COLORS.textTertiary);
    label.x = x - 10;
    label.y = height - 22;
    container.appendChild(label);
  }
}

function drawMiniEasingCurve(
  container: FrameNode,
  bezier: CubicBezier,
  x: number,
  y: number,
  w: number,
  h: number,
  color: RGB
): void {
  const padX = 4;
  const padY = 4;
  const graphW = w - padX * 2;
  const graphH = h - padY * 2;

  if (graphW < 10 || graphH < 10) return;

  // Map normalized bezier coords (0-1) to pixel coords within the bar
  // Y is flipped: 0 at bottom, 1 at top
  const p0x = x + padX;
  const p0y = y + padY + graphH; // bottom-left (0,0)
  const p1x = x + padX + bezier.x1 * graphW;
  const p1y = y + padY + graphH - bezier.y1 * graphH; // control point 1
  const p2x = x + padX + bezier.x2 * graphW;
  const p2y = y + padY + graphH - bezier.y2 * graphH; // control point 2
  const p3x = x + padX + graphW;
  const p3y = y + padY; // top-right (1,1)

  const curvePath = figma.createVector();
  curvePath.name = 'Easing Curve';

  curvePath.vectorNetwork = {
    vertices: [
      { x: p0x, y: p0y, strokeCap: 'NONE', strokeJoin: 'MITER', cornerRadius: 0, handleMirroring: 'NONE' },
      { x: p3x, y: p3y, strokeCap: 'NONE', strokeJoin: 'MITER', cornerRadius: 0, handleMirroring: 'NONE' },
    ],
    segments: [{
      start: 0,
      end: 1,
      tangentStart: { x: p1x - p0x, y: p1y - p0y },
      tangentEnd: { x: p2x - p3x, y: p2y - p3y },
    }],
    regions: [],
  };

  curvePath.strokes = [{ type: 'SOLID', color }];
  curvePath.strokeWeight = 2;
  curvePath.fills = [];
  curvePath.x = 0;
  curvePath.y = 0;
  container.appendChild(curvePath);
}

function addKeyframeDiamond(container: FrameNode, x: number, y: number, color: RGB): void {
  const diamond = figma.createRectangle();
  diamond.resize(DIAMOND_SIZE, DIAMOND_SIZE);
  diamond.rotation = 45;
  diamond.x = x - DIAMOND_SIZE / 2;
  diamond.y = y - DIAMOND_SIZE / 2;
  diamond.fills = [{ type: 'SOLID', color }];
  diamond.cornerRadius = 1;
  container.appendChild(diamond);
}

function getPropertyColor(name: string): RGB {
  const colors = COLORS.propertyColors;
  if (colors[name]) return colors[name];

  // Fuzzy matching for common property names
  const lower = name.toLowerCase();
  if (lower.indexOf('position') >= 0) return COLORS.accentBlue;
  if (lower.indexOf('scale') >= 0) return COLORS.accentGreen;
  if (lower.indexOf('rotation') >= 0 || lower.indexOf('rotate') >= 0) return COLORS.accentPurple;
  if (lower.indexOf('opacity') >= 0) return COLORS.accentOrange;
  if (lower.indexOf('anchor') >= 0) return COLORS.textTertiary;

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

function getAllAnimatedProperties(layer: Layer): AnimatedProperty[] {
  const result: AnimatedProperty[] = [];
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
    if (p && p.isAnimated) result.push(p);
  }
  return result;
}
