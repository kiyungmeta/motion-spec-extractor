# Motion Spec Extractor

Extract motion/animation data from Adobe After Effects compositions and generate polished, visual motion specification documents directly in Figma.

Give engineers, designers, and creative stakeholders a clear, readable reference for all animation details — easing curves, timing, property values, and code snippets — without manually documenting them.

## How It Works

```
AE Composition → ExtendScript extracts → JSON file → Figma plugin reads → Visual spec on canvas
```

1. **Run the AE script** on any After Effects composition to extract all animation data into a structured JSON file
2. **Load the JSON into the Figma plugin** to generate a complete motion spec document on your canvas

## What Gets Extracted

- **Composition metadata** — name, dimensions, frame rate, duration, background color, markers
- **All layer types** — shape, text, image, video, precomp, null, solid, camera, light, adjustment
- **Transform properties** — position (including separated X/Y), scale, rotation, opacity, anchor point
- **Keyframe data** — times, values, interpolation types, temporal and spatial easing
- **Easing curves** — AE speed/influence converted to CSS `cubic-bezier(x1, y1, x2, y2)` via Hermite-to-Bezier formula
- **Type-specific data** — shape paths/fills/strokes, text properties/animators, precomp recursion
- **Masks, effects, and expressions** — captured with full keyframe detail

## What Gets Generated in Figma

| Section | Description |
|---|---|
| **Header Card** | Composition name, dimensions, frame rate, duration, layer/keyframe counts |
| **Layer Timeline** | Gantt-style chart with layer bars, keyframe diamonds, and time ruler |
| **Layer Detail Cards** | 2-column grid with type badges, property tables, and visual easing curve graphs |
| **Easing Curves** | Actual bezier curves rendered via Figma's VectorNetwork API with control point handles |
| **CSS Code Snippets** | Auto-generated `transition` and `@keyframes` blocks in styled code cards |
| **Step Charts** | Frame-by-frame property value breakdown for complex animations (3+ keyframes) |

## Project Structure

```
motion-spec-extractor/
├── packages/
│   ├── shared/                # TypeScript types for the JSON interchange format
│   │   ├── src/types.ts       # 30 type definitions (MotionSpecDocument, Layer, Keyframe, etc.)
│   │   └── fixtures/          # Sample JSON for testing
│   ├── ae-extendscript/       # After Effects script (.jsx)
│   │   ├── src/main.jsx       # Entry point with UI dialog and progress bar
│   │   ├── src/extractors/    # Composition, layer, transform, keyframe, easing, shape, text, effects, masks
│   │   ├── src/utils/         # JSON serializer, file I/O, property tree walker
│   │   └── src/polyfills/     # ES3 compatibility (Array.forEach/map/filter, Object.keys, etc.)
│   └── figma-plugin/          # Figma plugin
│       ├── src/generators/    # Header, timeline, layer cards, easing curves, code snippets, step charts
│       ├── src/design-system/ # Tokens, primitives, layout helpers
│       ├── src/utils/         # Bezier math, CSS generation, value formatting
│       └── src/validators/    # JSON schema validation
```

## Setup

### Prerequisites

- Node.js 18+
- Adobe After Effects (for running the extraction script)
- Figma desktop app (for loading the plugin)

### Install & Build

```bash
git clone https://github.com/kiyungmeta/motion-spec-extractor.git
cd motion-spec-extractor
npm install
npm run build
```

This builds:
- `packages/shared/dist/` — compiled types
- `packages/ae-extendscript/dist/motion-spec-extractor.jsx` — concatenated AE script (66 KB)
- `packages/figma-plugin/dist/code.js` — bundled plugin code (42 KB)

### Build the AE Script

```bash
cd packages/ae-extendscript
node scripts/build.js
```

Outputs a single `dist/motion-spec-extractor.jsx` file with all `@include` directives resolved.

## Usage

### Step 1: Extract from After Effects

1. Open your composition in After Effects
2. Go to **File > Scripts > Run Script File...**
3. Select `packages/ae-extendscript/dist/motion-spec-extractor.jsx`
4. Configure options in the dialog (hidden layers, precomp depth, pretty-print)
5. Click **Extract** and choose where to save the `.json` file

### Step 2: Generate in Figma

1. Open Figma and go to **Plugins > Development > Import plugin from manifest...**
2. Select `packages/figma-plugin/manifest.json`
3. Run the plugin — it opens a panel where you can upload or paste your JSON
4. Review the preview (layer count, keyframes, dimensions)
5. Click **Generate Motion Spec** — the full spec document appears on your canvas

## Easing Conversion

The script converts After Effects' speed/influence easing model to CSS cubic-bezier control points using the Hermite-to-Bezier formula:

| AE Preset | Cubic Bezier Output |
|---|---|
| Linear | `cubic-bezier(0, 0, 1, 1)` |
| Easy Ease | `cubic-bezier(0.33, 0, 0.67, 1)` |
| Ease In | `cubic-bezier(0.42, 0, 1, 1)` |
| Ease Out | `cubic-bezier(0, 0, 0.58, 1)` |

Overshoot easing (y values outside 0-1) is preserved and rendered correctly in the Figma curve graphs.

## Design System

The generated spec uses a consistent design system:

- **Typography** — Inter for headings/body, Roboto Mono for code and easing labels
- **Colors** — Color-coded layer type badges (blue=shape, purple=text, green=image, orange=video)
- **Layout** — 1200px spec width, 4/8/16/24/32/48/64px spacing scale, 12px card radius
- **Cards** — White background with subtle drop shadows

## Technical Notes

- The AE ExtendScript is written in **ES3-compatible JavaScript** (no `let`/`const`, no arrow functions, no template literals) since ExtendScript has no modern JS support
- Custom polyfills are included for `JSON.stringify`, `Array.forEach/map/filter/indexOf/reduce`, `Object.keys`, and `String.trim`
- The Figma plugin uses **esbuild** for bundling and Figma's **VectorNetwork API** for rendering true bezier curves
- Precomposition extraction is recursive with a configurable depth cap (default: 5 levels)

## License

MIT
