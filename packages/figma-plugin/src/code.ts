import { generateSpecDocument } from './generators/spec-document';
import { validateMotionSpec } from './validators/schema-validator';
import type { MotionSpecDocument } from '@motion-spec/shared';

// Show the UI panel
figma.showUI(__html__, {
  width: 420,
  height: 560,
  themeColors: true
});

// Handle messages from the UI
figma.ui.onmessage = async (msg: { type: string; data?: unknown }) => {
  switch (msg.type) {
    case 'generate': {
      try {
        const data = msg.data as MotionSpecDocument;

        // Validate the data
        const validation = validateMotionSpec(data);
        if (!validation.valid) {
          figma.ui.postMessage({
            type: 'error',
            message: 'Invalid motion spec data:\n' + validation.errors.join('\n'),
          });
          return;
        }

        if (validation.warnings.length > 0) {
          figma.ui.postMessage({
            type: 'warnings',
            messages: validation.warnings,
          });
        }

        // Generate the spec document
        const doc = await generateSpecDocument(data);

        figma.ui.postMessage({
          type: 'success',
          message: `Motion spec generated! ${data.composition.layers.length} layers processed.`,
        });
      } catch (err) {
        figma.ui.postMessage({
          type: 'error',
          message: 'Error generating spec: ' + (err instanceof Error ? err.message : String(err)),
        });
      }
      break;
    }

    case 'cancel': {
      figma.closePlugin();
      break;
    }

    case 'resize': {
      const { width, height } = msg.data as { width: number; height: number };
      figma.ui.resize(width, height);
      break;
    }

    default:
      break;
  }
};
