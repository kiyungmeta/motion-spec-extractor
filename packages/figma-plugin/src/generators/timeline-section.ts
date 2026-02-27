import type { Composition, Layer } from '@motion-spec/shared';
import { COLORS, TYPOGRAPHY, SPACING, DIMENSIONS } from '../design-system/tokens';
import { createCard, createText, createRect, createAutoLayout, setFill } from '../design-system/primitives';

export function createTimelineSection(comp: Composition, width: number): FrameNode {
  const card = createCard(width, SPACING.lg, SPACING.sm);
  card.name = 'Timeline';

  // Section title
  const title = createText('Layer Timeline', TYPOGRAPHY.heading2, COLORS.textPrimary);
  card.appendChild(title);

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
  card.appendChild(container);

  // Time ruler
  createTimeRuler(container, labelWidth, timelineWidth, comp.duration, headerHeight);

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

    // Layer bar
    const barStart = (layer.inPoint / comp.duration) * timelineWidth;
    const barWidth = Math.max(2, ((layer.outPoint - layer.inPoint) / comp.duration) * timelineWidth);
    const barColor = COLORS.layerColors[layer.type] || COLORS.accentBlue;

    const bar = createRect(barWidth, rowHeight - 12, barColor, 4);
    bar.x = labelWidth + SPACING.md + barStart;
    bar.y = y + 6;
    container.appendChild(bar);

    // Keyframe diamonds
    if (layer.animationSummary.isAnimated) {
      for (const propSummary of layer.animationSummary.properties) {
        if (propSummary.keyframeCount > 0) {
          // Mark start and end of each property animation
          const startX = labelWidth + SPACING.md + ((propSummary.delay) / comp.duration) * timelineWidth;
          const endX = labelWidth + SPACING.md + ((propSummary.delay + propSummary.duration) / comp.duration) * timelineWidth;

          addKeyframeDiamond(container, startX, y + rowHeight / 2);
          if (propSummary.duration > 0) {
            addKeyframeDiamond(container, endX, y + rowHeight / 2);
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
  duration: number,
  height: number
): void {
  // Determine tick interval
  let tickInterval = 0.5;
  if (duration > 10) tickInterval = 2;
  else if (duration > 5) tickInterval = 1;
  else if (duration > 2) tickInterval = 0.5;
  else tickInterval = 0.25;

  // Ruler line
  const rulerLine = createRect(timelineWidth, 1, COLORS.timelineRuler);
  rulerLine.x = labelWidth + SPACING.md;
  rulerLine.y = height - 1;
  container.appendChild(rulerLine);

  // Time labels and ticks
  for (let t = 0; t <= duration; t += tickInterval) {
    const x = labelWidth + SPACING.md + (t / duration) * timelineWidth;

    // Tick mark
    const tick = createRect(1, 8, COLORS.timelineRuler);
    tick.x = x;
    tick.y = height - 8;
    container.appendChild(tick);

    // Time label
    const label = createText(t.toFixed(1) + 's', TYPOGRAPHY.caption, COLORS.textTertiary);
    label.x = x - 10;
    label.y = height - 24;
    container.appendChild(label);
  }
}

function addKeyframeDiamond(container: FrameNode, x: number, y: number): void {
  const size = 8;
  const diamond = figma.createPolygon();
  diamond.pointCount = 4;
  diamond.resize(size, size);
  diamond.rotation = 0;
  diamond.x = x - size / 2;
  diamond.y = y - size / 2;
  diamond.fills = [{ type: 'SOLID', color: COLORS.timelineKeyframe }];
  container.appendChild(diamond);
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 1) + '\u2026';
}
