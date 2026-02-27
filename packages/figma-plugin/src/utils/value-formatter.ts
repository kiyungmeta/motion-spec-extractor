import type { PropertyValue } from '@motion-spec/shared';

export function formatValue(value: PropertyValue, precision: number = 1): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return roundTo(value, precision).toString();
  if (Array.isArray(value)) {
    return '[' + value.map(v => roundTo(v, precision)).join(', ') + ']';
  }
  return String(value);
}

export function formatTime(seconds: number): string {
  if (seconds < 1) return (seconds * 1000).toFixed(0) + 'ms';
  return seconds.toFixed(2) + 's';
}

export function formatFrames(seconds: number, frameRate: number): string {
  return Math.round(seconds * frameRate) + 'f';
}

export function formatPercentage(value: number): string {
  return roundTo(value, 1) + '%';
}

export function formatDimensions(width: number, height: number): string {
  return `${width} \u00d7 ${height}`;
}

function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}
