import type { MotionSpecDocument } from '@motion-spec/shared';
import { SPACING } from '../design-system/tokens';
import { loadFonts } from '../design-system/primitives';
import { createSpecDocument, innerWidth, createSection, createTwoColumnGrid, columnWidth } from '../design-system/layout';
import { createHeaderSection } from './header-section';
import { createTimelineSection } from './timeline-section';
import { createLayerCard } from './layer-card';
import { createCodeSnippetSection } from './code-snippet';
import { createStepChart } from './step-chart';

export async function generateSpecDocument(doc: MotionSpecDocument): Promise<FrameNode> {
  // Load fonts first
  await loadFonts();

  const width = innerWidth();
  const root = createSpecDocument();

  // Notify progress
  figma.notify('Creating header section...');

  // 1. Header Section
  const header = createHeaderSection(doc, width);
  root.appendChild(header);

  // 2. Timeline Section
  figma.notify('Creating timeline...');
  const timeline = createTimelineSection(doc.composition, width);
  root.appendChild(timeline);

  // 3. Layer Detail Cards (2-column grid)
  figma.notify('Creating layer cards...');
  const layerSection = createSection('Layer Details', width);
  const sectionTitle = figma.createText();
  await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
  sectionTitle.fontName = { family: 'Inter', style: 'Semi Bold' };
  sectionTitle.fontSize = 24;
  sectionTitle.characters = 'Layer Details';
  sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.12 } }];
  layerSection.appendChild(sectionTitle);

  const grid = createTwoColumnGrid(width, SPACING.lg);
  const colW = columnWidth(SPACING.lg);

  const animatedLayers = doc.composition.layers.filter(l => l.animationSummary.isAnimated);
  const nonAnimatedLayers = doc.composition.layers.filter(l => !l.animationSummary.isAnimated);

  // Animated layers first
  for (let i = 0; i < animatedLayers.length; i++) {
    figma.notify(`Layer ${i + 1}/${animatedLayers.length}: ${animatedLayers[i].name}`);
    const card = createLayerCard(animatedLayers[i], colW);
    grid.appendChild(card);
  }

  // Then non-animated layers (collapsed)
  for (const layer of nonAnimatedLayers) {
    const card = createLayerCard(layer, colW);
    grid.appendChild(card);
  }

  layerSection.appendChild(grid);
  root.appendChild(layerSection);

  // 4. Code Snippets Section
  figma.notify('Generating code snippets...');
  const codeSection = createCodeSnippetSection(doc.composition.layers, width);
  root.appendChild(codeSection);

  // 5. Step Charts (for layers with 3+ keyframes)
  const stepLayers = doc.composition.layers.filter(
    l => l.animationSummary.properties.some(p => p.keyframeCount >= 3)
  );

  if (stepLayers.length > 0) {
    figma.notify('Creating step charts...');
    const stepSection = createSection('Step Breakdown', width);

    const stepTitle = figma.createText();
    await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
    stepTitle.fontName = { family: 'Inter', style: 'Semi Bold' };
    stepTitle.fontSize = 24;
    stepTitle.characters = 'Step Breakdown';
    stepTitle.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.12 } }];
    stepSection.appendChild(stepTitle);

    for (const layer of stepLayers) {
      const chart = createStepChart(layer, width);
      if (chart) stepSection.appendChild(chart);
    }

    root.appendChild(stepSection);
  }

  // Position the document on canvas
  const viewport = figma.viewport;
  root.x = Math.round(viewport.center.x - root.width / 2);
  root.y = Math.round(viewport.center.y);

  // Select and zoom to the document
  figma.currentPage.selection = [root];
  figma.viewport.scrollAndZoomIntoView([root]);

  figma.notify('Motion spec generated!', { timeout: 3000 });

  return root;
}
