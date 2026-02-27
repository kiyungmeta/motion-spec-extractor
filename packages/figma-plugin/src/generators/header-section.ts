import type { MotionSpecDocument } from '@motion-spec/shared';
import { COLORS, TYPOGRAPHY, SPACING, DIMENSIONS } from '../design-system/tokens';
import { createCard, createText, createAutoLayout, createDivider, createBadge } from '../design-system/primitives';
import { formatTime, formatDimensions } from '../utils/value-formatter';

export function createHeaderSection(doc: MotionSpecDocument, width: number): FrameNode {
  const comp = doc.composition;
  const card = createCard(width);
  card.name = 'Header';

  // Title
  const title = createText(comp.name, TYPOGRAPHY.heading1, COLORS.textPrimary, width - SPACING.lg * 2);
  card.appendChild(title);

  // Subtitle with "Motion Specification"
  const subtitle = createText('Motion Specification', TYPOGRAPHY.heading3, COLORS.textSecondary);
  card.appendChild(subtitle);

  card.appendChild(createDivider(width - SPACING.lg * 2));

  // Metadata grid - row 1: comp info
  const metaRow1 = createAutoLayout('HORIZONTAL', SPACING.xxl);
  metaRow1.counterAxisSizingMode = 'AUTO';

  metaRow1.appendChild(createMetaItem('Dimensions', formatDimensions(comp.width, comp.height)));
  metaRow1.appendChild(createMetaItem('Frame Rate', comp.frameRate.toFixed(2) + ' fps'));
  metaRow1.appendChild(createMetaItem('Comp Duration', formatTime(comp.duration)));

  // Calculate animation range and show it
  const animRange = getCompositionAnimationRange(doc);
  if (animRange) {
    metaRow1.appendChild(createMetaItem('Animation Range',
      formatTime(animRange.start) + ' – ' + formatTime(animRange.end) +
      '  (' + formatTime(animRange.end - animRange.start) + ')'
    ));
  }

  card.appendChild(metaRow1);

  // Metadata row 2: counts
  const metaRow2 = createAutoLayout('HORIZONTAL', SPACING.xxl);
  metaRow2.counterAxisSizingMode = 'AUTO';

  const totalLayers = comp.layers.length;
  const animatedLayers = comp.layers.filter(l => l.animationSummary.isAnimated).length;
  const totalKeyframes = comp.layers.reduce((sum, l) => sum + l.animationSummary.totalKeyframes, 0);

  metaRow2.appendChild(createMetaItem('Layers', totalLayers.toString()));
  metaRow2.appendChild(createMetaItem('Animated', animatedLayers.toString()));
  metaRow2.appendChild(createMetaItem('Keyframes', totalKeyframes.toString()));
  card.appendChild(metaRow2);

  // Export info
  if (doc.exportInfo) {
    card.appendChild(createDivider(width - SPACING.lg * 2));
    const exportInfo = createText(
      'Exported from After Effects ' + doc.exportInfo.aeVersion + ' • ' + doc.exportInfo.exportedAt,
      TYPOGRAPHY.caption,
      COLORS.textTertiary,
      width - SPACING.lg * 2
    );
    card.appendChild(exportInfo);
  }

  return card;
}

function getCompositionAnimationRange(doc: MotionSpecDocument): { start: number; end: number } | null {
  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const layer of doc.composition.layers) {
    if (!layer.animationSummary.isAnimated) continue;
    for (const prop of layer.animationSummary.properties) {
      const propStart = prop.delay;
      const propEnd = prop.delay + prop.duration;
      if (propStart < minTime) minTime = propStart;
      if (propEnd > maxTime) maxTime = propEnd;
    }
  }

  if (minTime === Infinity) return null;
  return { start: minTime, end: maxTime };
}

function createMetaItem(label: string, value: string): FrameNode {
  const item = createAutoLayout('VERTICAL', SPACING.xs);

  const labelText = createText(label.toUpperCase(), TYPOGRAPHY.label, COLORS.textTertiary);
  item.appendChild(labelText);

  const valueText = createText(value, TYPOGRAPHY.heading3, COLORS.textPrimary);
  item.appendChild(valueText);

  return item;
}
