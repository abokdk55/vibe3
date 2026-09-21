const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const roots = ['api', 'admin', 'curriculum', 'scripts', 'tests'];
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }
const files = ['index.html', 'site.js', 'playwright.config.cjs', ...roots.flatMap(walk)];
for (const file of files.filter((name) => /\.(?:js|cjs)$/.test(name))) execFileSync(process.execPath, ['--check', file]);
for (const file of files.filter((name) => name.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'Duplicate IDs: ' + file);
  for (const [, link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(?:[a-z]+:|\/\/)/i.test(link)) continue;
    const [url, hash] = link.split('#');
    let target = url ? path.resolve(url.startsWith('/') ? '.' : path.dirname(file), '.' + (url.startsWith('/') ? url : '/' + url)) : path.resolve(file);
    if (url === '/') target = path.resolve('index.html');
    if (!path.extname(target)) target += '.html';
    assert.ok(fs.existsSync(target), file + ': Missing link ' + link);
    if (hash) assert.ok(fs.readFileSync(target, 'utf8').includes('id="' + hash + '"'), file + ': Missing anchor ' + link);
  }
}
console.log('JavaScript syntax, HTML IDs, local links and anchors passed.');
