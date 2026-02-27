import type { Layer, AnimatedProperty, Keyframe, CubicBezier, PropertySummary } from '@motion-spec/shared';

// Generate CSS transition shorthand
export function generateCSSTransition(layer: Layer): string {
  if (!layer.animationSummary.isAnimated) return '/* No animation */';

  const transitions: string[] = [];
  for (const prop of layer.animationSummary.properties) {
    const cssProperty = mapAEPropertyToCSS(prop.name);
    if (!cssProperty) continue;

    const duration = prop.duration.toFixed(2) + 's';
    const delay = prop.delay > 0 ? ' ' + prop.delay.toFixed(2) + 's' : '';
    const easing = prop.easing ? prop.easing.css : 'linear';

    transitions.push(`  ${cssProperty} ${duration} ${easing}${delay}`);
  }

  if (transitions.length === 0) return '/* No CSS-mappable properties */';

  return `.${sanitizeClassName(layer.name)} {\n  transition:\n${transitions.join(',\n')};\n}`;
}

// Generate CSS @keyframes
export function generateCSSKeyframes(layer: Layer): string {
  if (!layer.animationSummary.isAnimated) return '';

  const lines: string[] = [];
  const animName = sanitizeClassName(layer.name);
  lines.push(`@keyframes ${animName} {`);

  // Collect all unique keyframe times across all animated properties
  const allTimes = new Set<number>();
  const animatedProps = getAnimatedTransformProps(layer);

  for (const prop of animatedProps) {
    if (prop.keyframes) {
      for (const kf of prop.keyframes) {
        allTimes.add(kf.time);
      }
    }
  }

  const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);
  if (sortedTimes.length === 0) return '';

  const totalDuration = sortedTimes[sortedTimes.length - 1] - sortedTimes[0];

  for (const time of sortedTimes) {
    const pct = totalDuration > 0
      ? Math.round(((time - sortedTimes[0]) / totalDuration) * 100)
      : 0;
    const label = pct === 0 ? 'from' : pct === 100 ? 'to' : `${pct}%`;

    lines.push(`  ${label} {`);

    for (const prop of animatedProps) {
      const cssName = mapAEPropertyToCSS(prop.name);
      if (!cssName || !prop.keyframes) continue;

      // Find the keyframe at or nearest before this time
      const kf = findKeyframeAtTime(prop.keyframes, time);
      if (kf) {
        lines.push(`    ${cssName}: ${formatCSSValue(cssName, kf.value)};`);
      }
    }

    lines.push('  }');
  }

  lines.push('}');
  return lines.join('\n');
}

function mapAEPropertyToCSS(aeName: string): string | null {
  const map: Record<string, string> = {
    'Position': 'translate',
    'X Position': 'translateX',
    'Y Position': 'translateY',
    'Scale': 'scale',
    'Rotation': 'rotate',
    'Z Rotation': 'rotate',
    'Opacity': 'opacity',
  };
  return map[aeName] || null;
}

function sanitizeClassName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function formatCSSValue(cssProperty: string, value: number | number[] | string): string {
  if (typeof value === 'string') return value;

  switch (cssProperty) {
    case 'opacity':
      return typeof value === 'number' ? (value / 100).toFixed(2) : String(value);
    case 'rotate':
      return typeof value === 'number' ? `${value.toFixed(1)}deg` : `${value}deg`;
    case 'scale':
      if (Array.isArray(value)) return `${(value[0] / 100).toFixed(2)}, ${(value[1] / 100).toFixed(2)}`;
      return (Number(value) / 100).toFixed(2);
    case 'translate':
    case 'translateX':
    case 'translateY':
      if (Array.isArray(value)) return `${value[0].toFixed(1)}px, ${value[1].toFixed(1)}px`;
      return `${Number(value).toFixed(1)}px`;
    default:
      return String(value);
  }
}

function findKeyframeAtTime(keyframes: Keyframe[], time: number): Keyframe | null {
  for (let i = keyframes.length - 1; i >= 0; i--) {
    if (Math.abs(keyframes[i].time - time) < 0.001) return keyframes[i];
  }
  return null;
}

function getAnimatedTransformProps(layer: Layer): AnimatedProperty[] {
  const result: AnimatedProperty[] = [];
  const t = layer.transform;
  const props = [t.anchorPoint, t.position, t.scale, t.rotation, t.opacity];
  if (t.positionSeparated) {
    props.push(t.positionSeparated.x, t.positionSeparated.y);
    if (t.positionSeparated.z) props.push(t.positionSeparated.z);
  }
  if (t.rotationX) props.push(t.rotationX);
  if (t.rotationY) props.push(t.rotationY);
  if (t.rotationZ) props.push(t.rotationZ);

  for (const p of props) {
    if (p && p.isAnimated) result.push(p);
  }
  return result;
}
