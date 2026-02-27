import type { PropertySummary } from '@motion-spec/shared';
import { COLORS, TYPOGRAPHY, SPACING, RGB, TypographyStyle } from '../design-system/tokens';
import { createText, createRect, createAutoLayout } from '../design-system/primitives';
import { formatValue, formatTime } from '../utils/value-formatter';

export function createPropertyTable(properties: PropertySummary[], width: number): FrameNode {
  const table = createAutoLayout('VERTICAL', 0);
  table.name = 'Property Table';
  table.counterAxisSizingMode = 'FIXED';
  table.resize(width, 10);

  // Header row
  const header = createTableRow(
    ['Property', 'Start', 'End', 'Duration', 'Delay'],
    TYPOGRAPHY.label,
    COLORS.textTertiary,
    width,
    COLORS.background
  );
  table.appendChild(header);

  // Data rows
  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    const bgColor = i % 2 === 0 ? COLORS.cardBackground : COLORS.background;

    const row = createTableRow(
      [
        prop.name,
        formatValue(prop.startValue),
        formatValue(prop.endValue),
        formatTime(prop.duration),
        prop.delay > 0 ? formatTime(prop.delay) : '\u2014',
      ],
      TYPOGRAPHY.bodySmall,
      COLORS.textPrimary,
      width,
      bgColor
    );
    table.appendChild(row);
  }

  return table;
}

function createTableRow(
  cells: string[],
  textStyle: TypographyStyle,
  textColor: RGB,
  totalWidth: number,
  bgColor: RGB
): FrameNode {
  // Column widths: proportional
  const colWidths = [0.28, 0.2, 0.2, 0.16, 0.16].map(pct => Math.floor(totalWidth * pct));

  const row = createAutoLayout('HORIZONTAL', 0);
  row.counterAxisSizingMode = 'AUTO';
  row.fills = [{ type: 'SOLID', color: bgColor }];
  row.paddingTop = SPACING.xs;
  row.paddingBottom = SPACING.xs;

  for (let i = 0; i < cells.length; i++) {
    const cellFrame = figma.createFrame();
    cellFrame.resize(colWidths[i], 20);
    cellFrame.fills = [];
    cellFrame.layoutMode = 'HORIZONTAL';
    cellFrame.primaryAxisSizingMode = 'FIXED';
    cellFrame.counterAxisSizingMode = 'AUTO';
    cellFrame.paddingLeft = SPACING.sm;
    cellFrame.paddingRight = SPACING.sm;

    const text = createText(cells[i], textStyle, textColor);
    cellFrame.appendChild(text);
    row.appendChild(cellFrame);
  }

  return row;
}
