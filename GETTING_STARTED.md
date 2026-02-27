# Getting Started

This guide walks you through building, installing, and using the Motion Spec Extractor from start to finish.

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **Adobe After Effects** — for running the extraction script
- **Figma desktop app** — for loading the plugin (browser version does not support local plugins)

## Build

Clone the repo and build all packages:

```bash
git clone https://github.com/kiyungmeta/motion-spec-extractor.git
cd motion-spec-extractor
npm install
npm run build
```

This produces three build artifacts:

| Output | Description |
|---|---|
| `packages/ae-extendscript/dist/motion-spec-extractor.jsx` | Concatenated AE script (~66 KB) |
| `packages/figma-plugin/dist/code.js` | Bundled Figma plugin code (~42 KB) |
| `packages/figma-plugin/dist/ui.html` | Figma plugin UI panel |

## Step 1: Extract Animation Data from After Effects

1. Open your After Effects project and select the composition you want to document
2. Go to **File > Scripts > Run Script File...**
3. Browse to `packages/ae-extendscript/dist/motion-spec-extractor.jsx`
4. A dialog appears with your composition info and three options:

   | Option | Default | Description |
   |---|---|---|
   | Include hidden layers | Off | Extract layers with visibility turned off |
   | Precomp depth | 5 | How many levels deep to recurse into nested compositions |
   | Pretty-print JSON | On | Format the output for readability |

5. Click **Extract**
6. Choose a location and filename for the `.json` output
7. Wait for the progress bar to complete — large compositions with many layers may take a moment

The output is a structured JSON file containing all composition metadata, layer data, keyframe values, easing curves, expressions, masks, and effects.

## Step 2: Load the Figma Plugin

You only need to do this once:

1. Open the **Figma desktop app**
2. Open any Figma file (or create a new one)
3. Go to **Plugins > Development > Import plugin from manifest...**
4. Navigate to `packages/figma-plugin/manifest.json` and select it

The plugin is now available under **Plugins > Development > Motion Spec Extractor**.

## Step 3: Generate the Motion Spec in Figma

1. Open the Figma file where you want the spec placed
2. Run **Plugins > Development > Motion Spec Extractor**
3. A plugin panel opens with two ways to load your data:
   - **Upload tab** — click "Browse" or drag and drop your `.json` file
   - **Paste tab** — paste the raw JSON text directly
4. The preview panel shows a summary of the loaded data:
   - Composition name, dimensions, frame rate, duration
   - Number of layers and total keyframes
5. Click **Generate Motion Spec**
6. The plugin generates the complete spec document on your canvas

### What gets generated

- **Header card** — composition name, dimensions, frame rate, duration, layer and keyframe counts
- **Layer timeline** — Gantt-style chart showing all layers as horizontal bars with keyframe diamond markers and a time ruler
- **Layer detail cards** — a 2-column grid where each animated layer gets a card containing:
  - Color-coded layer type badge
  - Property table (property name, start value, end value, duration, delay)
  - Visual easing curve graph with control point handles
  - Cubic-bezier notation label
  - Expression indicator (if applicable)
- **CSS code snippets** — auto-generated `transition` and `@keyframes` blocks
- **Step charts** — frame-by-frame value breakdown for properties with 3 or more keyframes

## Try It Without After Effects

A sample JSON fixture is included so you can test the Figma plugin immediately:

```
packages/shared/fixtures/sample-motion-spec.json
```

This fixture contains a composition with 5 layers (text, shape, precomp, null, solid) demonstrating various easing types, expressions, and masks. Load it into the Figma plugin to see the full spec output.

## Rebuilding After Changes

If you modify any source files:

```bash
# Rebuild everything
npm run build

# Or rebuild individual packages
cd packages/ae-extendscript && node scripts/build.js    # AE script only
cd packages/figma-plugin && node esbuild.config.mjs      # Figma plugin only
cd packages/shared && npx tsc --build                    # Shared types only
```

## Troubleshooting

**AE script won't run**
- Make sure you're using the built file from `dist/`, not the source files in `src/`
- ExtendScript requires the concatenated build since it doesn't support ES modules

**Figma plugin not appearing**
- You must use the Figma desktop app — browser Figma does not support local development plugins
- Re-import the manifest if the plugin disappears after a Figma update

**Fonts look wrong in the generated spec**
- The plugin uses Inter and Roboto Mono. If these aren't available, it falls back to Arial and Courier New
- Install [Inter](https://fonts.google.com/specimen/Inter) and [Roboto Mono](https://fonts.google.com/specimen/Roboto+Mono) for the best results

**JSON file is too large / generation is slow**
- Reduce precomp depth in the AE extraction dialog
- Exclude hidden layers if they aren't needed
- Very large compositions (100+ layers) may take longer to render in Figma
