import { COLORS, TYPOGRAPHY, SPACING, DIMENSIONS, SHADOWS, RGB, TypographyStyle, ShadowStyle } from './tokens';

// Font loading helper - must be called before creating text
export async function loadFonts(): Promise<void> {
  const fontsToLoad = [
    { family: 'Inter', style: 'Regular' },
    { family: 'Inter', style: 'Medium' },
    { family: 'Inter', style: 'Semi Bold' },
    { family: 'Inter', style: 'Bold' },
    { family: 'Roboto Mono', style: 'Regular' },
  ];

  for (const font of fontsToLoad) {
    try {
      await figma.loadFontAsync(font);
    } catch {
      // Fallback fonts
      try {
        if (font.family === 'Inter') {
          await figma.loadFontAsync({ family: 'Arial', style: font.style === 'Semi Bold' ? 'Bold' : font.style });
        } else {
          await figma.loadFontAsync({ family: 'Courier New', style: 'Regular' });
        }
      } catch {
        await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });
      }
    }
  }
}

// Create a text node with typography style
export function createText(
  content: string,
  style: TypographyStyle,
  color: RGB = COLORS.textPrimary,
  width?: number
): TextNode {
  const text = figma.createText();
  text.characters = content;
  try {
    text.fontName = { family: style.family, style: style.style };
  } catch {
    text.fontName = { family: 'Arial', style: 'Regular' };
  }
  text.fontSize = style.size;
  text.lineHeight = { value: style.lineHeight, unit: 'PIXELS' };
  text.letterSpacing = { value: style.letterSpacing, unit: 'PIXELS' };
  text.fills = [{ type: 'SOLID', color }];
  if (width) {
    text.resize(width, text.height);
    text.textAutoResize = 'HEIGHT';
  } else {
    text.textAutoResize = 'WIDTH_AND_HEIGHT';
  }
  return text;
}

// Create a rectangle with optional fill, radius, and shadow
export function createRect(
  width: number,
  height: number,
  fill: RGB = COLORS.cardBackground,
  radius: number = 0,
  shadow?: ShadowStyle
): RectangleNode {
  const rect = figma.createRectangle();
  rect.resize(width, height);
  rect.fills = [{ type: 'SOLID', color: fill }];
  if (radius > 0) {
    rect.cornerRadius = radius;
  }
  if (shadow) {
    rect.effects = [{
      type: 'DROP_SHADOW',
      color: { ...shadow.color },
      offset: shadow.offset,
      radius: shadow.radius,
      spread: shadow.spread,
      visible: true,
      blendMode: 'NORMAL',
    }];
  }
  return rect;
}

// Create a card frame with auto-layout
export function createCard(
  width: number,
  padding: number = SPACING.lg,
  gap: number = SPACING.md
): FrameNode {
  const frame = figma.createFrame();
  frame.resize(width, 100); // height will auto-adjust
  frame.fills = [{ type: 'SOLID', color: COLORS.cardBackground }];
  frame.cornerRadius = DIMENSIONS.cardRadius;
  frame.effects = [{
    type: 'DROP_SHADOW',
    color: { ...SHADOWS.card.color },
    offset: SHADOWS.card.offset,
    radius: SHADOWS.card.radius,
    spread: SHADOWS.card.spread,
    visible: true,
    blendMode: 'NORMAL',
  }];
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'FIXED';
  frame.paddingTop = padding;
  frame.paddingBottom = padding;
  frame.paddingLeft = padding;
  frame.paddingRight = padding;
  frame.itemSpacing = gap;
  return frame;
}

// Create an auto-layout frame (horizontal or vertical)
export function createAutoLayout(
  direction: 'HORIZONTAL' | 'VERTICAL',
  gap: number = SPACING.md,
  padding: number = 0
): FrameNode {
  const frame = figma.createFrame();
  frame.fills = [];
  frame.layoutMode = direction;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.paddingTop = padding;
  frame.paddingBottom = padding;
  frame.paddingLeft = padding;
  frame.paddingRight = padding;
  frame.itemSpacing = gap;
  return frame;
}

// Create a badge (colored label)
export function createBadge(label: string, color: RGB): FrameNode {
  const badge = createAutoLayout('HORIZONTAL', SPACING.xs, SPACING.xs);
  badge.paddingLeft = SPACING.sm;
  badge.paddingRight = SPACING.sm;
  badge.fills = [{ type: 'SOLID', color, opacity: 0.15 }];
  badge.cornerRadius = DIMENSIONS.badgeRadius;

  const text = createText(label.toUpperCase(), TYPOGRAPHY.label, color);
  badge.appendChild(text);
  return badge;
}

// Create a divider line
export function createDivider(width: number): RectangleNode {
  const line = figma.createRectangle();
  line.resize(width, 1);
  line.fills = [{ type: 'SOLID', color: COLORS.curveGrid }];
  return line;
}

// Create a code block
export function createCodeBlock(
  code: string,
  width: number
): FrameNode {
  const block = figma.createFrame();
  block.resize(width, 40);
  block.fills = [{ type: 'SOLID', color: COLORS.codeBackground }];
  block.cornerRadius = DIMENSIONS.codeBlockRadius;
  block.layoutMode = 'VERTICAL';
  block.primaryAxisSizingMode = 'AUTO';
  block.counterAxisSizingMode = 'FIXED';
  block.paddingTop = SPACING.md;
  block.paddingBottom = SPACING.md;
  block.paddingLeft = SPACING.md;
  block.paddingRight = SPACING.md;

  const text = createText(code, TYPOGRAPHY.code, COLORS.textCode, width - SPACING.md * 2);
  block.appendChild(text);
  return block;
}

// Helper to set RGB fill
export function setFill(node: GeometryMixin, color: RGB, opacity: number = 1): void {
  node.fills = [{ type: 'SOLID', color, opacity }];
}

// Helper to set stroke
export function setStroke(node: GeometryMixin, color: RGB, weight: number = 1): void {
  node.strokes = [{ type: 'SOLID', color }];
  (node as any).strokeWeight = weight;
}
