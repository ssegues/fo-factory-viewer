// Minimal static server for the viewer. No dependencies.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT ?? 4174);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
};

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  if (path === '/') {
    response.writeHead(302, { Location: '/viewer/' }).end();
    return;
  }
  const relative = normalize(path.endsWith('/') ? path + 'index.html' : path).replace(/^([/\\])+/, '');
  if (relative.includes('..')) {
    response.writeHead(400).end('Bad request');
    return;
  }
  try {
    const body = await readFile(join(root, relative));
    response.writeHead(200, {
      'Content-Type': types[extname(relative)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`FactoryOps Lab viewer ready at http://127.0.0.1:${port}`);
});
