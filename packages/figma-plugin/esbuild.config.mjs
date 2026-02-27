import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const isWatch = process.argv.includes('--watch');

// Build the sandbox code (code.ts → dist/code.js)
// Figma's sandbox VM requires ES6 target
const codeBuild = {
  entryPoints: ['src/code.ts'],
  bundle: true,
  outfile: 'dist/code.js',
  target: 'es2017',
  format: 'iife',
  sourcemap: false,
  minify: !isWatch,
};

// Build the UI (ui.ts → temp file, then inline into ui.html)
const uiBuild = {
  entryPoints: ['src/ui.ts'],
  bundle: true,
  outfile: 'dist/ui.js',
  target: 'es2017',
  format: 'iife',
  sourcemap: false,
  minify: !isWatch,
};

async function build() {
  // Build code.ts
  await esbuild.build(codeBuild);
  console.log('Built code.js');

  // Build ui.ts
  await esbuild.build(uiBuild);
  console.log('Built ui.js');

  // Read the HTML template, CSS, and built JS
  const htmlTemplate = fs.readFileSync('src/ui.html', 'utf8');
  const cssContent = fs.readFileSync('src/ui.css', 'utf8');
  const jsContent = fs.readFileSync('dist/ui.js', 'utf8');

  // Inline CSS and JS into HTML
  const finalHtml = htmlTemplate
    .replace('<!-- INLINE_CSS -->', `<style>${cssContent}</style>`)
    .replace('<!-- INLINE_JS -->', `<script>${jsContent}</script>`);

  fs.writeFileSync('dist/ui.html', finalHtml, 'utf8');
  console.log('Built ui.html (inlined CSS + JS)');

  // Clean up temp JS file
  fs.unlinkSync('dist/ui.js');
}

if (isWatch) {
  // Watch mode: rebuild on changes
  const codeCtx = await esbuild.context(codeBuild);
  const uiCtx = await esbuild.context(uiBuild);
  await codeCtx.watch();
  await uiCtx.watch();
  console.log('Watching for changes...');
} else {
  build().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
