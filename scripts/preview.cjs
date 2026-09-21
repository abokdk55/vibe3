// Static preview only. APIs are deliberately not loaded and secrets are never read.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const publicFiles = new Set(['index.html', 'style.css', 'site.js', 'profile-cutout.png', 'admin/index.html', 'admin/admin.js', 'admin/admin.css', ...fs.readdirSync(path.join(root, 'curriculum')).filter((name) => name.endsWith('.html')).map((name) => 'curriculum/' + name)]);
function createPreviewServer() { return http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, ''); }
  catch { res.writeHead(400).end(); return; }
  if (!pathname) pathname = 'index.html';
  if (pathname === 'admin' || pathname === 'admin/') pathname = 'admin/index.html';
  if (!path.extname(pathname)) pathname += '.html';
  if (!publicFiles.has(pathname)) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(pathname)], 'Cache-Control': 'no-store' });
  fs.createReadStream(path.join(root, pathname)).pipe(res);
}); }
if (require.main === module) createPreviewServer().listen(4173, '127.0.0.1', () => console.log('Static preview: http://127.0.0.1:4173 (APIs unavailable)'));
module.exports = { createPreviewServer };
