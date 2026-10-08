// Local preview: serves the repository root with caching disabled and
// rebuilds whenever something in src/ or site.config.json changes.
//   npm run dev  ->  http://localhost:5173/

import { watch } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

// The 404 page uses absolute paths under the production base (e.g. /hazeon/),
// so that prefix is served from the root as well.
let base = '/';
async function readBase() {
  try {
    const config = JSON.parse(await fs.readFile(path.join(ROOT, 'site.config.json'), 'utf8'));
    base = new URL(config.siteUrl).pathname;
  } catch {
    base = '/';
  }
}

async function rebuild() {
  await readBase();
  try {
    const { ms } = await build();
    console.log(`[dev] rebuilt in ${ms} ms`);
  } catch (err) {
    console.error(`[dev] build failed: ${err.message || err}`);
  }
}

await rebuild();

let timer;
const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 120);
};
watch(path.join(ROOT, 'src'), { recursive: true }, schedule);
watch(path.join(ROOT, 'site.config.json'), schedule);

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (base !== '/' && url.pathname.startsWith(base)) url.pathname = url.pathname.slice(base.length - 1);
    let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (!file.startsWith(ROOT) || /[\\/](node_modules|src|scripts|\.git)([\\/]|$)/.test(file.slice(ROOT.length))) {
      res.writeHead(403).end();
      return;
    }
    try {
      if ((await fs.stat(file)).isDirectory()) {
        if (!url.pathname.endsWith('/')) {
          res.writeHead(301, { Location: url.pathname + '/' + url.search }).end();
          return;
        }
        file = path.join(file, 'index.html');
      }
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    } catch {
      const body = await fs.readFile(path.join(ROOT, '404.html')).catch(() => 'Not found');
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(body);
    }
  })
  .listen(PORT, () => console.log(`[dev] http://localhost:${PORT}/`));
