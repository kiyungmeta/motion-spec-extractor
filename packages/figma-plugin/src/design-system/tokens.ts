// ============ Colors ============
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const COLORS = {
  // Backgrounds
  background: { r: 0.96, g: 0.96, b: 0.97 } as RGB,       // #F5F5F7 light gray
  cardBackground: { r: 1, g: 1, b: 1 } as RGB,              // #FFFFFF white
  codeBackground: { r: 0.12, g: 0.12, b: 0.14 } as RGB,    // #1E1E24 dark

  // Text
  textPrimary: { r: 0.1, g: 0.1, b: 0.12 } as RGB,         // #1A1A1F
  textSecondary: { r: 0.4, g: 0.4, b: 0.45 } as RGB,       // #666673
  textTertiary: { r: 0.6, g: 0.6, b: 0.65 } as RGB,        // #9999A6
  textOnDark: { r: 0.9, g: 0.9, b: 0.92 } as RGB,          // #E6E6EB
  textCode: { r: 0.68, g: 0.85, b: 0.68 } as RGB,          // #ADD9AD green code

  // Accents
  accentBlue: { r: 0.25, g: 0.47, b: 0.96 } as RGB,        // #4078F5
  accentPurple: { r: 0.55, g: 0.36, b: 0.86 } as RGB,      // #8C5CDB
  accentGreen: { r: 0.18, g: 0.72, b: 0.53 } as RGB,       // #2EB887
  accentOrange: { r: 0.95, g: 0.55, b: 0.2 } as RGB,       // #F28C33
  accentRed: { r: 0.9, g: 0.3, b: 0.3 } as RGB,            // #E64D4D
  accentYellow: { r: 0.95, g: 0.78, b: 0.2 } as RGB,       // #F2C733

  // Layer type colors (for badges)
  layerColors: {
    shape: { r: 0.25, g: 0.47, b: 0.96 },
    text: { r: 0.55, g: 0.36, b: 0.86 },
    image: { r: 0.18, g: 0.72, b: 0.53 },
    video: { r: 0.95, g: 0.55, b: 0.2 },
    precomp: { r: 0.95, g: 0.78, b: 0.2 },
    null: { r: 0.6, g: 0.6, b: 0.65 },
    solid: { r: 0.4, g: 0.4, b: 0.45 },
    camera: { r: 0.9, g: 0.3, b: 0.3 },
    light: { r: 0.95, g: 0.85, b: 0.3 },
    adjustment: { r: 0.4, g: 0.65, b: 0.9 },
  } as Record<string, RGB>,

  // Easing curve
  curveGrid: { r: 0.9, g: 0.9, b: 0.92 } as RGB,
  curveAxis: { r: 0.7, g: 0.7, b: 0.73 } as RGB,
  curveLine: { r: 0.25, g: 0.47, b: 0.96 } as RGB,
  curveHandle: { r: 0.9, g: 0.3, b: 0.3 } as RGB,
  curveHandleLine: { r: 0.9, g: 0.3, b: 0.3 } as RGB,

  // Timeline
  timelineRuler: { r: 0.7, g: 0.7, b: 0.73 } as RGB,
  timelineBar: { r: 0.25, g: 0.47, b: 0.96 } as RGB,
  timelineKeyframe: { r: 0.95, g: 0.55, b: 0.2 } as RGB,
  timelineRowEven: { r: 0.97, g: 0.97, b: 0.98 } as RGB,
  timelineRowOdd: { r: 1, g: 1, b: 1 } as RGB,
};

// ============ Typography ============
export interface TypographyStyle {
  family: string;
  style: string;
  size: number;
  lineHeight: number;
  letterSpacing: number;
}

export const TYPOGRAPHY: Record<string, TypographyStyle> = {
  heading1: { family: 'Inter', style: 'Bold', size: 32, lineHeight: 40, letterSpacing: -0.5 },
  heading2: { family: 'Inter', style: 'Semi Bold', size: 24, lineHeight: 32, letterSpacing: -0.3 },
  heading3: { family: 'Inter', style: 'Semi Bold', size: 18, lineHeight: 24, letterSpacing: 0 },
  heading4: { family: 'Inter', style: 'Medium', size: 14, lineHeight: 20, letterSpacing: 0 },
  body: { family: 'Inter', style: 'Regular', size: 14, lineHeight: 20, letterSpacing: 0 },
  bodySmall: { family: 'Inter', style: 'Regular', size: 12, lineHeight: 16, letterSpacing: 0 },
  caption: { family: 'Inter', style: 'Regular', size: 10, lineHeight: 14, letterSpacing: 0.2 },
  code: { family: 'Roboto Mono', style: 'Regular', size: 13, lineHeight: 20, letterSpacing: 0 },
  codeSmall: { family: 'Roboto Mono', style: 'Regular', size: 11, lineHeight: 16, letterSpacing: 0 },
  label: { family: 'Inter', style: 'Medium', size: 11, lineHeight: 14, letterSpacing: 0.5 },
};

// ============ Spacing ============
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// ============ Dimensions ============
export const DIMENSIONS = {
  specWidth: 1200,
  cardRadius: 12,
  badgeRadius: 6,
  codeBlockRadius: 8,
  easingCurveSize: 160,  // width and height of easing curve graph
  timelineRowHeight: 36,
  timelineHeaderHeight: 40,
  layerCardWidth: 560,   // for 2-col grid (1200 - 48 - 24) / 2
  shadowOffset: 2,
  shadowBlur: 8,
  shadowSpread: 0,
} as const;

// ============ Shadows ============
export interface ShadowStyle {
  color: { r: number; g: number; b: number; a: number };
  offset: { x: number; y: number };
  radius: number;
  spread: number;
}

export const SHADOWS: Record<string, ShadowStyle> = {
  card: {
    color: { r: 0, g: 0, b: 0, a: 0.08 },
    offset: { x: 0, y: 2 },
    radius: 8,
    spread: 0,
  },
  elevated: {
    color: { r: 0, g: 0, b: 0, a: 0.12 },
    offset: { x: 0, y: 4 },
    radius: 16,
    spread: 0,
  },
};
