import type { Layer, CubicBezier } from '@motion-spec/shared';
import { COLORS, TYPOGRAPHY, SPACING, DIMENSIONS } from '../design-system/tokens';
import { createCard, createText, createAutoLayout, createBadge, createDivider } from '../design-system/primitives';
import { createPropertyTable } from './property-table';
import { createEasingCurve } from './easing-curve';
import { formatTime } from '../utils/value-formatter';

export function createLayerCard(layer: Layer, width: number): FrameNode {
  const card = createCard(width, SPACING.md, SPACING.md);
  card.name = 'Layer: ' + layer.name;

  // Header row: badge + layer name
  const headerRow = createAutoLayout('HORIZONTAL', SPACING.sm);
  headerRow.counterAxisAlignItems = 'CENTER';

  const badge = createBadge(layer.type, COLORS.layerColors[layer.type] || COLORS.accentBlue);
  headerRow.appendChild(badge);

  const layerName = createText(layer.name, TYPOGRAPHY.heading3, COLORS.textPrimary);
  headerRow.appendChild(layerName);

  card.appendChild(headerRow);

  // Time info row — show layer span and animation duration separately
  const timeRow = createAutoLayout('HORIZONTAL', SPACING.xl);
  timeRow.counterAxisSizingMode = 'AUTO';

  // Layer span
  const layerSpan = createAutoLayout('VERTICAL', SPACING.xs);
  const spanLabel = createText('LAYER SPAN', TYPOGRAPHY.label, COLORS.textTertiary);
  layerSpan.appendChild(spanLabel);
  const spanValue = createText(
    formatTime(layer.inPoint) + ' – ' + formatTime(layer.outPoint) + '  (' + formatTime(layer.outPoint - layer.inPoint) + ')',
    TYPOGRAPHY.bodySmall,
    COLORS.textSecondary
  );
  layerSpan.appendChild(spanValue);
  timeRow.appendChild(layerSpan);

  // Animation duration (if animated)
  if (layer.animationSummary.isAnimated && layer.animationSummary.properties.length > 0) {
    const animRange = getLayerAnimationRange(layer);
    const animInfo = createAutoLayout('VERTICAL', SPACING.xs);
    const animLabel = createText('ANIMATION', TYPOGRAPHY.label, COLORS.accentBlue);
    animInfo.appendChild(animLabel);
    const animValue = createText(
      formatTime(animRange.start) + ' – ' + formatTime(animRange.end) + '  (' + formatTime(animRange.end - animRange.start) + ')',
      TYPOGRAPHY.body,
      COLORS.textPrimary
    );
    animInfo.appendChild(animValue);
    timeRow.appendChild(animInfo);
  }

  card.appendChild(timeRow);

  if (!layer.animationSummary.isAnimated) {
    const noAnim = createText('No keyframed animation', TYPOGRAPHY.body, COLORS.textTertiary);
    card.appendChild(noAnim);
    return card;
  }

  card.appendChild(createDivider(width - SPACING.md * 2));

  // Property table
  if (layer.animationSummary.properties.length > 0) {
    const table = createPropertyTable(
      layer.animationSummary.properties,
      width - SPACING.md * 2
    );
    card.appendChild(table);
  }

  // Easing curves row - show unique easing curves
  const uniqueEasings = getUniqueEasings(layer);
  if (uniqueEasings.length > 0) {
    card.appendChild(createDivider(width - SPACING.md * 2));

    const easingTitle = createText('Easing Curves', TYPOGRAPHY.heading4, COLORS.textSecondary);
    card.appendChild(easingTitle);

    const easingRow = createAutoLayout('HORIZONTAL', SPACING.md);
    easingRow.layoutWrap = 'WRAP';

    for (const easing of uniqueEasings) {
      const curveWidget = createEasingCurve(easing, DIMENSIONS.easingCurveSize);
      easingRow.appendChild(curveWidget);
    }

    card.appendChild(easingRow);
  }

  // Expression indicator
  const expressionProps = getExpressionProperties(layer);
  if (expressionProps.length > 0) {
    card.appendChild(createDivider(width - SPACING.md * 2));
    const exprTitle = createText('Expressions', TYPOGRAPHY.heading4, COLORS.accentPurple);
    card.appendChild(exprTitle);

    for (const expr of expressionProps) {
      const exprText = createText(
        expr.name + ': ' + (expr.expression || '').substring(0, 80) + (expr.expression && expr.expression.length > 80 ? '...' : ''),
        TYPOGRAPHY.codeSmall,
        COLORS.textSecondary,
        width - SPACING.md * 2
      );
      card.appendChild(exprText);
    }
  }

  return card;
}

function getLayerAnimationRange(layer: Layer): { start: number; end: number } {
  let start = Infinity;
  let end = 0;
  for (const prop of layer.animationSummary.properties) {
    if (prop.delay < start) start = prop.delay;
    if (prop.delay + prop.duration > end) end = prop.delay + prop.duration;
  }
  return { start: start === Infinity ? 0 : start, end };
}

function getUniqueEasings(layer: Layer): CubicBezier[] {
  const seen = new Set<string>();
  const result: CubicBezier[] = [];

  for (const prop of layer.animationSummary.properties) {
    if (prop.easing && !seen.has(prop.easing.css)) {
      seen.add(prop.easing.css);
      result.push(prop.easing);
    }
  }

  return result;
}

function getExpressionProperties(layer: Layer): { name: string; expression?: string }[] {
  const result: { name: string; expression?: string }[] = [];
  const t = layer.transform;
  const props = [t.anchorPoint, t.position, t.scale, t.rotation, t.opacity];

  for (const p of props) {
    if (p && p.expression) {
      result.push({ name: p.name, expression: p.expression });
    }
  }

  return result;
}
