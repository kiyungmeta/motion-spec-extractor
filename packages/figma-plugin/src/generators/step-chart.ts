import type { Layer, AnimatedProperty, Keyframe } from '@motion-spec/shared';
import { COLORS, TYPOGRAPHY, SPACING } from '../design-system/tokens';
import { createCard, createText, createRect, createAutoLayout, createDivider } from '../design-system/primitives';
import { bezierYForX } from '../utils/bezier-math';
import { formatValue, formatTime } from '../utils/value-formatter';

export function createStepChart(layer: Layer, width: number): FrameNode | null {
  // Only create for layers with 3+ keyframes on any property
  const qualifyingProps = layer.animationSummary.properties.filter(p => p.keyframeCount >= 3);
  if (qualifyingProps.length === 0) return null;

  const card = createCard(width, SPACING.md, SPACING.md);
  card.name = 'Step Chart: ' + layer.name;

  const title = createText('Step Breakdown: ' + layer.name, TYPOGRAPHY.heading4, COLORS.textPrimary);
  card.appendChild(title);

  // For each qualifying property, create a step breakdown
  for (const propSummary of qualifyingProps) {
    // Find the actual animated property with keyframes
    const animProp = findAnimatedProperty(layer, propSummary.name);
    if (!animProp || !animProp.keyframes || animProp.keyframes.length < 3) continue;

    const propTitle = createText(propSummary.name, TYPOGRAPHY.heading4, COLORS.textSecondary);
    card.appendChild(propTitle);

    // Create step table
    const table = createAutoLayout('VERTICAL', 0);
    table.counterAxisSizingMode = 'FIXED';
    table.resize(width - SPACING.md * 2, 10);

    // Header
    const header = createStepRow(['Step', 'Time', 'Value', 'Easing to Next'], width - SPACING.md * 2, true);
    table.appendChild(header);

    // Rows for each keyframe
    for (let i = 0; i < animProp.keyframes.length; i++) {
      const kf = animProp.keyframes[i];
      const easingStr = (i < animProp.keyframes.length - 1 && kf.temporalEasing)
        ? kf.temporalEasing.cubicBezier.css
        : '\u2014';

      const row = createStepRow(
        [
          (i + 1).toString(),
          formatTime(kf.time),
          formatValue(kf.value),
          easingStr
        ],
        width - SPACING.md * 2,
        false,
        i % 2 === 0
      );
      table.appendChild(row);
    }

    card.appendChild(table);

    // Visual bar chart of values (for numeric properties)
    if (typeof animProp.keyframes[0].value === 'number') {
      const barChart = createValueBarChart(animProp.keyframes as (Keyframe & { value: number })[], width - SPACING.md * 2);
      if (barChart) card.appendChild(barChart);
    }

    card.appendChild(createDivider(width - SPACING.md * 2));
  }

  return card;
}

function createStepRow(cells: string[], totalWidth: number, isHeader: boolean, isEven: boolean = true): FrameNode {
  const colWidths = [0.1, 0.2, 0.3, 0.4].map(p => Math.floor(totalWidth * p));

  const row = createAutoLayout('HORIZONTAL', 0);
  row.counterAxisSizingMode = 'AUTO';
  row.fills = [{ type: 'SOLID', color: isHeader ? COLORS.background : (isEven ? COLORS.cardBackground : COLORS.background) }];
  row.paddingTop = SPACING.xs;
  row.paddingBottom = SPACING.xs;

  for (let i = 0; i < cells.length; i++) {
    const cellFrame = figma.createFrame();
    cellFrame.resize(colWidths[i], 16);
    cellFrame.fills = [];
    cellFrame.layoutMode = 'HORIZONTAL';
    cellFrame.primaryAxisSizingMode = 'FIXED';
    cellFrame.counterAxisSizingMode = 'AUTO';
    cellFrame.paddingLeft = SPACING.sm;

    const style = isHeader ? TYPOGRAPHY.label : TYPOGRAPHY.codeSmall;
    const color = isHeader ? COLORS.textTertiary : COLORS.textPrimary;
    const text = createText(cells[i], style, color);
    cellFrame.appendChild(text);
    row.appendChild(cellFrame);
  }

  return row;
}

function createValueBarChart(keyframes: (Keyframe & { value: number })[], width: number): FrameNode | null {
  if (keyframes.length < 2) return null;

  const values = keyframes.map(kf => kf.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;
  if (range === 0) return null;

  const chartHeight = 60;
  const barWidth = Math.max(4, Math.floor((width - keyframes.length * 2) / keyframes.length));

  const chart = figma.createFrame();
  chart.name = 'Value Bar Chart';
  chart.resize(width, chartHeight + 20);
  chart.fills = [];
  chart.layoutMode = 'HORIZONTAL';
  chart.primaryAxisSizingMode = 'FIXED';
  chart.counterAxisSizingMode = 'FIXED';
  chart.counterAxisAlignItems = 'MAX';
  chart.itemSpacing = 2;
  chart.paddingBottom = 20;

  for (const kf of keyframes) {
    const normalized = (kf.value - minVal) / range;
    const barHeight = Math.max(4, Math.round(normalized * chartHeight));

    const bar = createRect(barWidth, barHeight, COLORS.accentBlue, 2);
    chart.appendChild(bar);
  }

  return chart;
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
