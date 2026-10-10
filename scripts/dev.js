#!/usr/bin/env node
// Local preview with the same routing as Vercel: static files from public/,
// then the rewrites in vercel.json, then /api/<name> -> api/<name>.js.
// Without BLOB_READ_WRITE_TOKEN, cards come from ./.data.
//   SESSION_SECRET=... node scripts/dev.js   ->  http://localhost:3000
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const PUBLIC = path.resolve('public');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const { rewrites = [] } = JSON.parse(await readFile('vercel.json', 'utf8'));

// "/fixtures/:league" -> regex with named groups.
const compiled = rewrites.map((r) => ({
  re: new RegExp(`^${r.source.replace(/\./g, '\\.').replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`),
  dest: r.destination,
}));

function rewrite(pathname, search) {
  for (const { re, dest } of compiled) {
    const m = pathname.match(re);
    if (!m) continue;
    const target = new URL(dest.replace(/:(\w+)/g, (_, k) => encodeURIComponent(m.groups[k])), 'http://x');
    for (const [k, v] of new URLSearchParams(search)) target.searchParams.set(k, v);
    return target.pathname + target.search;
  }
  return null;
}

async function serveStatic(pathname, res) {
  const file = path.join(PUBLIC, pathname);
  if (!file.startsWith(PUBLIC)) return false;
  try {
    if (!(await stat(file)).isFile()) return false;
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(await readFile(file));
    return true;
  } catch {
    return false;
  }
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (await serveStatic(url.pathname, res)) return;
    const target = rewrite(url.pathname, url.search);
    if (target) req.url = target;
    const route = new URL(req.url, 'http://x').pathname.match(/^\/api\/([a-z-]+)$/);
    if (!route) return res.writeHead(404).end('not found');
    try {
      const { default: handler } = await import(path.resolve('api', `${route[1]}.js`));
      await handler(req, res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.writeHead(500).end('error');
    }
  })
  .listen(PORT, () => console.log(`http://localhost:${PORT}`));
