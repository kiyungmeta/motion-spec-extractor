import type { RGB } from '../design-system/tokens';

export function rgbToHex(color: RGB): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

export function withOpacity(color: RGB, opacity: number): SolidPaint {
  return { type: 'SOLID', color, opacity };
}

export function aeColorToRgb(aeColor: [number, number, number]): RGB {
  return { r: aeColor[0], g: aeColor[1], b: aeColor[2] };
}
