import { COLORS, SPACING, DIMENSIONS } from './tokens';

// Create the root spec document frame
export function createSpecDocument(): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'Motion Spec Document';
  frame.resize(DIMENSIONS.specWidth, 100);
  frame.fills = [{ type: 'SOLID', color: COLORS.background }];
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'FIXED';
  frame.paddingTop = SPACING.xxl;
  frame.paddingBottom = SPACING.xxl;
  frame.paddingLeft = SPACING.xxl;
  frame.paddingRight = SPACING.xxl;
  frame.itemSpacing = SPACING.xl;
  return frame;
}

// Create a section wrapper with title
export function createSection(title: string, width: number): FrameNode {
  const section = figma.createFrame();
  section.name = title;
  section.fills = [];
  section.layoutMode = 'VERTICAL';
  section.primaryAxisSizingMode = 'AUTO';
  section.counterAxisSizingMode = 'FIXED';
  section.resize(width, 100);
  section.itemSpacing = SPACING.md;
  return section;
}

// Create a 2-column grid layout
export function createTwoColumnGrid(width: number, gap: number = SPACING.lg): FrameNode {
  const grid = figma.createFrame();
  grid.name = 'Grid';
  grid.fills = [];
  grid.layoutMode = 'HORIZONTAL';
  grid.primaryAxisSizingMode = 'FIXED';
  grid.counterAxisSizingMode = 'AUTO';
  grid.resize(width, 100);
  grid.itemSpacing = gap;
  grid.layoutWrap = 'WRAP';
  return grid;
}

// Calculate inner width (spec width minus padding)
export function innerWidth(): number {
  return DIMENSIONS.specWidth - SPACING.xxl * 2;
}

// Calculate column width for 2-col grid
export function columnWidth(gap: number = SPACING.lg): number {
  return Math.floor((innerWidth() - gap) / 2);
}
