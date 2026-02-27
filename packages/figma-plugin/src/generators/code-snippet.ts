import type { Layer } from '@motion-spec/shared';
import { COLORS, TYPOGRAPHY, SPACING } from '../design-system/tokens';
import { createCard, createText, createAutoLayout, createCodeBlock, createDivider } from '../design-system/primitives';
import { generateCSSTransition, generateCSSKeyframes } from '../utils/css-generator';

export function createCodeSnippetSection(layers: Layer[], width: number): FrameNode {
  const section = createAutoLayout('VERTICAL', SPACING.md);
  section.name = 'Code Snippets';
  section.counterAxisSizingMode = 'FIXED';
  section.resize(width, 10);

  const title = createText('CSS Code Snippets', TYPOGRAPHY.heading2, COLORS.textPrimary);
  section.appendChild(title);

  const subtitle = createText(
    'Auto-generated CSS for web implementation. Values are approximated from AE keyframe data.',
    TYPOGRAPHY.bodySmall,
    COLORS.textSecondary,
    width
  );
  section.appendChild(subtitle);

  const animatedLayers = layers.filter(l => l.animationSummary.isAnimated);

  for (const layer of animatedLayers) {
    const card = createCard(width, SPACING.md, SPACING.md);
    card.name = 'Code: ' + layer.name;

    // Layer name header
    const layerTitle = createText(layer.name, TYPOGRAPHY.heading4, COLORS.textPrimary);
    card.appendChild(layerTitle);

    // CSS Transition
    const transitionCode = generateCSSTransition(layer);
    if (transitionCode && !transitionCode.includes('No animation') && !transitionCode.includes('No CSS')) {
      const transLabel = createText('Transition', TYPOGRAPHY.label, COLORS.textTertiary);
      card.appendChild(transLabel);

      const transBlock = createCodeBlock(transitionCode, width - SPACING.md * 2);
      card.appendChild(transBlock);
    }

    // CSS Keyframes
    const keyframesCode = generateCSSKeyframes(layer);
    if (keyframesCode) {
      const kfLabel = createText('@keyframes', TYPOGRAPHY.label, COLORS.textTertiary);
      card.appendChild(kfLabel);

      const kfBlock = createCodeBlock(keyframesCode, width - SPACING.md * 2);
      card.appendChild(kfBlock);
    }

    section.appendChild(card);
  }

  if (animatedLayers.length === 0) {
    const noAnim = createText('No animated layers to generate code for.', TYPOGRAPHY.body, COLORS.textTertiary);
    section.appendChild(noAnim);
  }

  return section;
}
