export interface Point {
  x: number;
  y: number;
}

// Sample a cubic bezier curve at parameter t (0-1)
// P0 = (0,0), P1 = (x1,y1), P2 = (x2,y2), P3 = (1,1)
export function sampleCubicBezier(
  x1: number, y1: number,
  x2: number, y2: number,
  t: number
): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * 0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * 1,
    y: mt3 * 0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * 1,
  };
}

// Generate an array of points along the bezier curve for rendering
export function generateCurvePoints(
  x1: number, y1: number,
  x2: number, y2: number,
  numPoints: number = 64
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    points.push(sampleCubicBezier(x1, y1, x2, y2, t));
  }
  return points;
}

// Find the Y value for a given X on the bezier curve (using Newton's method)
export function bezierYForX(
  x1: number, y1: number,
  x2: number, y2: number,
  targetX: number,
  epsilon: number = 0.0001
): number {
  // Newton-Raphson to find t for given x
  let t = targetX; // initial guess
  for (let i = 0; i < 10; i++) {
    const point = sampleCubicBezier(x1, y1, x2, y2, t);
    const dx = point.x - targetX;
    if (Math.abs(dx) < epsilon) return point.y;

    // Derivative of x with respect to t
    const mt = 1 - t;
    const dxdt = 3 * mt * mt * x1 + 6 * mt * t * (x2 - x1) + 3 * t * t * (1 - x2);
    if (Math.abs(dxdt) < epsilon) break;
    t -= dx / dxdt;
    t = Math.max(0, Math.min(1, t));
  }
  return sampleCubicBezier(x1, y1, x2, y2, t).y;
}

// Check if a bezier has overshoot (y values outside [0, 1])
export function hasOvershoot(y1: number, y2: number): boolean {
  return y1 < 0 || y1 > 1 || y2 < 0 || y2 > 1;
}

// Get the range of y values for proper scaling
export function getYRange(x1: number, y1: number, x2: number, y2: number): { min: number; max: number } {
  const points = generateCurvePoints(x1, y1, x2, y2, 100);
  let min = 0, max = 1;
  for (const p of points) {
    if (p.y < min) min = p.y;
    if (p.y > max) max = p.y;
  }
  return { min, max };
}
