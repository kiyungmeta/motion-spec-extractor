const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const distDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function resolveIncludes(filePath, visited) {
  visited = visited || {};
  if (visited[filePath]) return '';
  visited[filePath] = true;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const result = [];

  for (const line of lines) {
    const match = line.match(/^\/\/\s*@include\s+"([^"]+)"/);
    if (match) {
      const includePath = path.resolve(path.dirname(filePath), match[1]);
      result.push('// ========== ' + match[1] + ' ==========');
      result.push(resolveIncludes(includePath, visited));
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

const mainFile = path.join(srcDir, 'main.jsx');
const output = resolveIncludes(mainFile);

const banner = [
  '/**',
  ' * Motion Spec Extractor for Adobe After Effects',
  ' * Version: 1.0.0',
  ' * Built: ' + new Date().toISOString(),
  ' * This file is auto-generated. Do not edit directly.',
  ' */',
  ''
].join('\n');

fs.writeFileSync(path.join(distDir, 'motion-spec-extractor.jsx'), banner + output, 'utf8');
console.log('Build complete: dist/motion-spec-extractor.jsx');
console.log('Size: ' + Math.round((banner + output).length / 1024) + ' KB');
