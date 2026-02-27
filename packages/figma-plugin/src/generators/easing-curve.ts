import type { CubicBezier } from '@motion-spec/shared';
import { COLORS, TYPOGRAPHY, SPACING, DIMENSIONS, RGB } from '../design-system/tokens';
import { createText, createRect, createAutoLayout, setFill, setStroke } from '../design-system/primitives';
import { hasOvershoot, getYRange } from '../utils/bezier-math';

const CURVE_SIZE = DIMENSIONS.easingCurveSize; // 160px
const PADDING = 20;
const GRAPH_SIZE = CURVE_SIZE - PADDING * 2; // 120px

export function createEasingCurve(bezier: CubicBezier, width: number): FrameNode {
  const wrapper = createAutoLayout('VERTICAL', SPACING.sm);
  wrapper.name = 'Easing Curve';
  wrapper.counterAxisAlignItems = 'CENTER';

  // Graph container
  const graphFrame = figma.createFrame();
  graphFrame.name = 'Curve Graph';
  graphFrame.resize(CURVE_SIZE, CURVE_SIZE);
  graphFrame.fills = [{ type: 'SOLID', color: COLORS.cardBackground }];
  graphFrame.cornerRadius = 8;
  graphFrame.strokes = [{ type: 'SOLID', color: COLORS.curveGrid }];
  graphFrame.strokeWeight = 1;

  // Determine Y range for overshoot handling
  const yRange = getYRange(bezier.x1, bezier.y1, bezier.x2, bezier.y2);
  const overshoot = hasOvershoot(bezier.y1, bezier.y2);
  const yMin = overshoot ? Math.min(yRange.min, -0.1) : 0;
  const yMax = overshoot ? Math.max(yRange.max, 1.1) : 1;
  const yScale = GRAPH_SIZE / (yMax - yMin);

  // Helper: convert normalized (0-1) coords to pixel coords
  // Figma Y is top-down, math Y is bottom-up -> flip
  function toPixelX(normX: number): number {
    return PADDING + normX * GRAPH_SIZE;
  }
  function toPixelY(normY: number): number {
    return PADDING + (yMax - normY) * yScale;
  }

  // Draw grid (4x4)
  for (let i = 0; i <= 4; i++) {
    const frac = i / 4;
    // Vertical grid line
    const vLine = createRect(1, GRAPH_SIZE, COLORS.curveGrid);
    vLine.x = toPixelX(frac);
    vLine.y = PADDING;
    graphFrame.appendChild(vLine);

    // Horizontal grid line
    const hLine = createRect(GRAPH_SIZE, 1, COLORS.curveGrid);
    hLine.x = PADDING;
    hLine.y = toPixelY(frac);
    graphFrame.appendChild(hLine);
  }

  // Draw axis lines (thicker)
  const xAxis = createRect(GRAPH_SIZE + 1, 2, COLORS.curveAxis);
  xAxis.x = PADDING;
  xAxis.y = toPixelY(0) - 1;
  graphFrame.appendChild(xAxis);

  const yAxis = createRect(2, GRAPH_SIZE + 1, COLORS.curveAxis);
  yAxis.x = toPixelX(0) - 1;
  yAxis.y = PADDING;
  graphFrame.appendChild(yAxis);

  // Draw the bezier curve using VectorNetwork
  const curvePath = figma.createVector();
  curvePath.name = 'Bezier Curve';

  // Start point (0,0) and end point (1,1) in pixel coords
  const p0x = toPixelX(0), p0y = toPixelY(0);
  const p1x = toPixelX(bezier.x1), p1y = toPixelY(bezier.y1);
  const p2x = toPixelX(bezier.x2), p2y = toPixelY(bezier.y2);
  const p3x = toPixelX(1), p3y = toPixelY(1);

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

  curvePath.strokes = [{ type: 'SOLID', color: COLORS.curveLine }];
  curvePath.strokeWeight = 2.5;
  curvePath.fills = [];
  curvePath.resize(CURVE_SIZE, CURVE_SIZE);
  // Reset position since vectorNetwork uses absolute coords within the vector
  curvePath.x = 0;
  curvePath.y = 0;
  graphFrame.appendChild(curvePath);

  // Draw control point handle lines (dashed)
  const handleLine1 = createHandleLine(p0x, p0y, p1x, p1y);
  graphFrame.appendChild(handleLine1);

  const handleLine2 = createHandleLine(p3x, p3y, p2x, p2y);
  graphFrame.appendChild(handleLine2);

  // Draw endpoints (filled circles)
  const startDot = createDot(p0x, p0y, 5, COLORS.curveLine);
  graphFrame.appendChild(startDot);
  const endDot = createDot(p3x, p3y, 5, COLORS.curveLine);
  graphFrame.appendChild(endDot);

  // Draw control points (filled circles, different color)
  const cp1Dot = createDot(p1x, p1y, 5, COLORS.curveHandle);
  graphFrame.appendChild(cp1Dot);
  const cp2Dot = createDot(p2x, p2y, 5, COLORS.curveHandle);
  graphFrame.appendChild(cp2Dot);

  wrapper.appendChild(graphFrame);

  // CSS label below the graph
  const cssLabel = createText(bezier.css, TYPOGRAPHY.codeSmall, COLORS.textSecondary);
  wrapper.appendChild(cssLabel);

  return wrapper;
}

function createHandleLine(x1: number, y1: number, x2: number, y2: number): VectorNode {
  const line = figma.createVector();
  line.name = 'Handle Line';

  line.vectorNetwork = {
    vertices: [
      { x: x1, y: y1, strokeCap: 'ROUND', strokeJoin: 'MITER', cornerRadius: 0, handleMirroring: 'NONE' },
      { x: x2, y: y2, strokeCap: 'ROUND', strokeJoin: 'MITER', cornerRadius: 0, handleMirroring: 'NONE' },
    ],
    segments: [{
      start: 0,
      end: 1,
    }],
    regions: [],
  };

  line.strokes = [{ type: 'SOLID', color: COLORS.curveHandleLine }];
  line.strokeWeight = 1;
  line.dashPattern = [4, 4];
  line.fills = [];
  line.x = 0;
  line.y = 0;

  return line;
}

function createDot(cx: number, cy: number, radius: number, color: RGB): EllipseNode {
  const dot = figma.createEllipse();
  dot.resize(radius * 2, radius * 2);
  dot.x = cx - radius;
  dot.y = cy - radius;
  dot.fills = [{ type: 'SOLID', color }];
  dot.strokes = [];
  return dot;
}
