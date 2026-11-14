// Local server for the viewer. No dependencies.
// Besides static files it offers two actions: re-reading production orders and jobs from the ERP
// into a local snapshot, and saving the local model mapping (visuals.json). The browser never sees credentials; the read runs here and is GET-only.
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { access, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT ?? 4174);
const connection = process.env.FO_CONNECTION ?? join(root, 'data', 'local', 'connection.local.json');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
};

const exists = (path) => access(path).then(() => true, () => false);
const json = (response, status, body) => response.writeHead(status, { 'Content-Type': types['.json'], 'Cache-Control': 'no-store' }).end(JSON.stringify(body));

/** Only real extracts under data/local can be refreshed; the sample has no ERP behind it. */
function snapshotFolder(dataset) {
  if (typeof dataset !== 'string' || !/^local\/[\w-]+$/.test(dataset)) return null;
  return join(root, 'data', dataset);
}
async function ordersStatus(dataset) {
  const folder = snapshotFolder(dataset);
  if (!folder || !(await exists(join(folder, 'snapshot.json')))) return { available: false, reason: 'This data set is not a local ERP extract.' };
  if (!(await exists(connection))) return { available: false, reason: 'No connection file (data/local/connection.local.json).' };
  const { meta } = JSON.parse(await readFile(join(folder, 'snapshot.json'), 'utf8'));
  return { available: true, busy: running, company: meta.company, site: meta.site, environment: meta.orders?.environment ?? null, readAt: meta.orders?.readAt ?? null, orders: meta.orders?.orders ?? null };
}

/** The visuals file is the local presentation layer: which model stands for which resource. Never sent to the ERP. */
const MODELS = new Set(['cnc', 'robot', 'pack', 'press', 'inspect', 'bench', 'vendor', 'tank']);
function cleanVisuals(input) {
  if (!input || typeof input !== 'object') throw new Error('Expected an object.');
  const map = (value) => {
    const out = {};
    for (const [key, model] of Object.entries(value && typeof value === 'object' ? value : {})) {
      if (key.length > 80 || !MODELS.has(model)) throw new Error(`Unknown model for "${key.slice(0, 80)}".`);
      out[key] = model;
    }
    return out;
  };
  if (!MODELS.has(input.fallback)) throw new Error('Unknown default model.');
  return { note: 'Local presentation layer. Never written back to the ERP.', byResource: map(input.byResource), byGroup: map(input.byGroup), byType: map(input.byType), byCapability: map(input.byCapability), fallback: input.fallback };
}
async function readBody(request, limit = 200_000) {
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > limit) throw new Error('Request too large.'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

let running = false;
async function refreshOrders(dataset) {
  const status = await ordersStatus(dataset);
  if (!status.available) return { code: 409, body: { error: status.reason } };
  if (running) return { code: 409, body: { error: 'A refresh is already running.' } };
  running = true;
  try {
    const args = [join(root, 'tools', 'extract-orders.mjs'), snapshotFolder(dataset), '--connection', connection, '--company', String(status.company), '--site', String(status.site)];
    const failure = await new Promise((resolve) => execFile(process.execPath, args, { cwd: root, windowsHide: true, timeout: 180_000 }, (error, stdout, stderr) => {
      console.log(stdout.trim());
      resolve(error ? (stderr.trim().split('\n').pop() || error.message) : null);
    }));
    running = false;
    if (failure) return { code: 502, body: { error: failure } };
    return { code: 200, body: await ordersStatus(dataset) };
  } finally { running = false; }
}

/** The refresh must come from this page: same origin, plus a header a cross-site form cannot send. */
function fromViewer(request) {
  const origin = request.headers.origin;
  return request.headers['x-factoryops'] === '1' && (!origin || origin === `http://127.0.0.1:${port}` || origin === `http://localhost:${port}`);
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const path = decodeURIComponent(url.pathname);
  if (path === '/') {
    response.writeHead(302, { Location: '/viewer/' }).end();
    return;
  }
  if (path === '/api/orders') {
    const dataset = url.searchParams.get('data');
    try {
      if (request.method === 'GET') return json(response, 200, await ordersStatus(dataset));
      if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' });
      if (!fromViewer(request)) return json(response, 403, { error: 'Forbidden' });
      const result = await refreshOrders(dataset);
      return json(response, result.code, result.body);
    } catch (error) { return json(response, 500, { error: error.message }); }
  }
  if (path === '/api/visuals') {
    const folder = snapshotFolder(url.searchParams.get('data'));
    try {
      if (request.method !== 'PUT') return json(response, 405, { error: 'Method not allowed' });
      if (!fromViewer(request)) return json(response, 403, { error: 'Forbidden' });
      if (!folder || !(await exists(join(folder, 'snapshot.json')))) return json(response, 409, { error: 'Only local extracts can be saved.' });
      await writeFile(join(folder, 'visuals.json'), JSON.stringify(cleanVisuals(await readBody(request)), null, 2) + '\n');
      return json(response, 200, { saved: true });
    } catch (error) { return json(response, 400, { error: error.message }); }
  }
  const relative = normalize(path.endsWith('/') ? path + 'index.html' : path).replace(/^([/\\])+/, '');
  if (relative.includes('..') || /\.local\.json$/i.test(relative)) {
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
