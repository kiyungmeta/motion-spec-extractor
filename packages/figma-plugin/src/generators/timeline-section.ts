import type { Composition, Layer } from '@motion-spec/shared';
import { COLORS, TYPOGRAPHY, SPACING, DIMENSIONS } from '../design-system/tokens';
import { createCard, createText, createRect, createAutoLayout, setFill } from '../design-system/primitives';

// Calculate the effective time range from keyframe data (not full comp duration)
function getEffectiveTimeRange(comp: Composition): { start: number; end: number } {
  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const layer of comp.layers) {
    if (!layer.animationSummary.isAnimated) continue;
    for (const prop of layer.animationSummary.properties) {
      const propStart = prop.delay;
      const propEnd = prop.delay + prop.duration;
      if (propStart < minTime) minTime = propStart;
      if (propEnd > maxTime) maxTime = propEnd;
    }
  }

  // No animations found — fall back to comp duration
  if (minTime === Infinity) {
    return { start: 0, end: comp.duration };
  }

  // Add 15% padding on each side for breathing room
  const range = maxTime - minTime;
  const padding = Math.max(range * 0.15, 0.2);
  return {
    start: Math.max(0, minTime - padding),
    end: Math.min(comp.duration, maxTime + padding),
  };
}

export function createTimelineSection(comp: Composition, width: number): FrameNode {
  const card = createCard(width, SPACING.lg, SPACING.sm);
  card.name = 'Timeline';

  // Section title
  const title = createText('Layer Timeline', TYPOGRAPHY.heading2, COLORS.textPrimary);
  card.appendChild(title);

  // Calculate effective time range (zoom to animation)
  const timeRange = getEffectiveTimeRange(comp);
  const displayDuration = timeRange.end - timeRange.start;

  // Show range info if different from comp duration
  if (timeRange.start > 0 || timeRange.end < comp.duration) {
    const rangeInfo = createText(
      'Showing ' + timeRange.start.toFixed(2) + 's – ' + timeRange.end.toFixed(2) + 's  (comp duration: ' + comp.duration.toFixed(2) + 's)',
      TYPOGRAPHY.bodySmall,
      COLORS.textTertiary
    );
    card.appendChild(rangeInfo);
  }

  // Timeline container (non-auto-layout for absolute positioning)
  const labelWidth = 150;
  const timelineWidth = width - SPACING.lg * 2 - labelWidth - SPACING.md;
  const rowHeight = DIMENSIONS.timelineRowHeight;
  const headerHeight = DIMENSIONS.timelineHeaderHeight;
  const totalHeight = headerHeight + comp.layers.length * rowHeight;

  const container = figma.createFrame();
  container.name = 'Timeline Chart';
  container.resize(width - SPACING.lg * 2, totalHeight);
  container.fills = [];
  container.clipsContent = true;
  card.appendChild(container);

  // Time ruler
  createTimeRuler(container, labelWidth, timelineWidth, timeRange.start, displayDuration, headerHeight);

  // Layer rows
  for (let i = 0; i < comp.layers.length; i++) {
    const layer = comp.layers[i];
    const y = headerHeight + i * rowHeight;

    // Alternating row background
    const rowBg = createRect(width - SPACING.lg * 2, rowHeight,
      i % 2 === 0 ? COLORS.timelineRowEven : COLORS.timelineRowOdd);
    rowBg.x = 0;
    rowBg.y = y;
    container.appendChild(rowBg);

    // Layer name label
    const nameText = createText(
      truncateText(layer.name, 18),
      TYPOGRAPHY.bodySmall,
      COLORS.textPrimary
    );
    nameText.x = SPACING.sm;
    nameText.y = y + (rowHeight - 16) / 2;
    container.appendChild(nameText);

    // Layer bar — position relative to the effective time range
    const barStartTime = Math.max(layer.inPoint, timeRange.start);
    const barEndTime = Math.min(layer.outPoint, timeRange.end);
    const barStart = ((barStartTime - timeRange.start) / displayDuration) * timelineWidth;
    const barWidth = Math.max(2, ((barEndTime - barStartTime) / displayDuration) * timelineWidth);
    const barColor = COLORS.layerColors[layer.type] || COLORS.accentBlue;

    const bar = createRect(barWidth, rowHeight - 12, barColor, 4);
    bar.x = labelWidth + SPACING.md + barStart;
    bar.y = y + 6;
    container.appendChild(bar);

    // Keyframe diamonds — positioned by actual keyframe times
    if (layer.animationSummary.isAnimated) {
      for (const propSummary of layer.animationSummary.properties) {
        if (propSummary.keyframeCount > 0) {
          // Place diamonds at start and end of each property animation
          const kfStartTime = propSummary.delay;
          const kfEndTime = propSummary.delay + propSummary.duration;

          // Also place intermediate keyframe markers if 3+
          if (propSummary.keyframeCount === 2) {
            addKeyframeDiamond(container,
              labelWidth + SPACING.md + ((kfStartTime - timeRange.start) / displayDuration) * timelineWidth,
              y + rowHeight / 2);
            if (propSummary.duration > 0) {
              addKeyframeDiamond(container,
                labelWidth + SPACING.md + ((kfEndTime - timeRange.start) / displayDuration) * timelineWidth,
                y + rowHeight / 2);
            }
          } else {
            // For 3+ keyframes, place evenly spaced diamonds
            for (let k = 0; k < propSummary.keyframeCount; k++) {
              const t = propSummary.keyframeCount > 1
                ? kfStartTime + (kfEndTime - kfStartTime) * (k / (propSummary.keyframeCount - 1))
                : kfStartTime;
              addKeyframeDiamond(container,
                labelWidth + SPACING.md + ((t - timeRange.start) / displayDuration) * timelineWidth,
                y + rowHeight / 2);
            }
          }
        }
      }
    }
  }

  return card;
}

function createTimeRuler(
  container: FrameNode,
  labelWidth: number,
  timelineWidth: number,
  startTime: number,
  duration: number,
  height: number
): void {
  // Determine tick interval based on displayed duration
  let tickInterval: number;
  if (duration > 10) tickInterval = 2;
  else if (duration > 5) tickInterval = 1;
  else if (duration > 2) tickInterval = 0.5;
  else if (duration > 0.5) tickInterval = 0.25;
  else tickInterval = 0.1;

  // Ruler line
  const rulerLine = createRect(timelineWidth, 1, COLORS.timelineRuler);
  rulerLine.x = labelWidth + SPACING.md;
  rulerLine.y = height - 1;
  container.appendChild(rulerLine);

  // Round start to nearest tick
  const firstTick = Math.ceil(startTime / tickInterval) * tickInterval;

  // Time labels and ticks
  for (let t = firstTick; t <= startTime + duration + 0.001; t += tickInterval) {
    const x = labelWidth + SPACING.md + ((t - startTime) / duration) * timelineWidth;

    // Tick mark
    const tick = createRect(1, 8, COLORS.timelineRuler);
    tick.x = x;
    tick.y = height - 8;
    container.appendChild(tick);

    // Time label
    const labelStr = t < 1 ? (t * 1000).toFixed(0) + 'ms' : t.toFixed(2) + 's';
    const label = createText(labelStr, TYPOGRAPHY.caption, COLORS.textTertiary);
    label.x = x - 10;
    label.y = height - 24;
    container.appendChild(label);
  }
}

function addKeyframeDiamond(container: FrameNode, x: number, y: number): void {
  const size = 10;
  // Use a rotated rectangle as a diamond (more compatible than createPolygon)
  const diamond = figma.createRectangle();
  diamond.resize(size, size);
  diamond.rotation = 45;
  diamond.x = x - size / 2;
  diamond.y = y - size / 2;
  diamond.fills = [{ type: 'SOLID', color: COLORS.timelineKeyframe }];
  diamond.cornerRadius = 1;
  container.appendChild(diamond);
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 1) + '\u2026';
}
