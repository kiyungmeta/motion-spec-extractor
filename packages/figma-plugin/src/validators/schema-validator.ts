import type { MotionSpecDocument, Composition, Layer } from '@motion-spec/shared';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateMotionSpec(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Input is not a valid object'], warnings };
  }

  const doc = data as Record<string, unknown>;

  // Check required top-level fields
  if (!doc.version) errors.push('Missing "version" field');
  if (!doc.composition) errors.push('Missing "composition" field');
  if (!doc.exportInfo) warnings.push('Missing "exportInfo" field');

  if (doc.composition && typeof doc.composition === 'object') {
    validateComposition(doc.composition as Record<string, unknown>, errors, warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateComposition(comp: Record<string, unknown>, errors: string[], warnings: string[]): void {
  if (!comp.name) errors.push('Composition missing "name"');
  if (typeof comp.width !== 'number') errors.push('Composition missing "width"');
  if (typeof comp.height !== 'number') errors.push('Composition missing "height"');
  if (typeof comp.frameRate !== 'number') errors.push('Composition missing "frameRate"');
  if (typeof comp.duration !== 'number') errors.push('Composition missing "duration"');

  if (!Array.isArray(comp.layers)) {
    errors.push('Composition missing "layers" array');
  } else {
    if (comp.layers.length === 0) warnings.push('Composition has no layers');
    for (let i = 0; i < comp.layers.length; i++) {
      validateLayer(comp.layers[i] as Record<string, unknown>, i, errors, warnings);
    }
  }
}

function validateLayer(layer: Record<string, unknown>, index: number, errors: string[], warnings: string[]): void {
  if (!layer.name) errors.push(`Layer ${index}: missing "name"`);
  if (!layer.type) errors.push(`Layer ${index}: missing "type"`);
  if (typeof layer.inPoint !== 'number') warnings.push(`Layer ${index}: missing "inPoint"`);
  if (typeof layer.outPoint !== 'number') warnings.push(`Layer ${index}: missing "outPoint"`);
  if (!layer.transform) warnings.push(`Layer ${index}: missing "transform"`);
  if (!layer.animationSummary) warnings.push(`Layer ${index}: missing "animationSummary"`);
}

// Quick check if data looks like a MotionSpecDocument
export function isMotionSpecDocument(data: unknown): data is MotionSpecDocument {
  if (!data || typeof data !== 'object') return false;
  const doc = data as Record<string, unknown>;
  return typeof doc.version === 'string' && doc.composition !== undefined;
}
