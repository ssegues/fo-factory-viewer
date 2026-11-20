// Reads the names of the items a data set refers to (GET only) and writes them to data/<set>/items.json.
// Items are collected from the snapshot (products, BOM lines, production order lines) and from warehouses.json
// (fixed items, warehouse work lines). The viewer uses the names for product icons; nothing else depends on them.
//
//   node tools/extract-items.mjs <data-folder> [--connection data/local/connection.local.json] [--company usmf]
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { connect } from './fo-client.mjs';

async function readJson(file) { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; } }

/** Item numbers that the snapshot and the warehouse file of a data folder mention. */
export async function referencedItems(folder) {
  const ids = new Set(), add = (id) => { if (id) ids.add(String(id)); };
  const snap = await readJson(join(folder, 'snapshot.json')), wh = await readJson(join(folder, 'warehouses.json'));
  for (const r of snap?.routes ?? []) add(r.productId);
  for (const b of snap?.boms ?? []) { add(b.productId); for (const l of b.lines ?? []) add(l.itemNumber); }
  for (const o of snap?.productionOrders ?? []) { add(o.productId); for (const l of o.materials ?? []) add(l.itemNumber); }
  for (const w of wh?.warehouses ?? []) {
    for (const l of w.locations ?? []) for (const i of l.fixedItems ?? []) add(i);
    for (const work of w.work ?? []) for (const l of work.lines ?? []) add(l.itemNumber);
  }
  return ids;
}

/** Reads names and product groups of released products in one company and keeps those the folder refers to. */
export async function extractItems(fo, folder, company) {
  const ids = await referencedItems(folder);
  const rows = await fo.read('ReleasedProductsV2', { filter: `dataAreaId eq '${company}'`, select: ['ItemNumber', 'SearchName', 'ProductSearchName', 'ProductGroupId'], limit: 20000 });
  const items = {};
  for (const r of rows) if (ids.has(r.ItemNumber)) items[r.ItemNumber] = { name: r.SearchName || r.ProductSearchName || null, group: r.ProductGroupId || null };
  const file = join(folder, 'items.json');
  await writeFile(file, JSON.stringify({ meta: { source: 'odata', entity: 'ReleasedProductsV2', environment: fo.environment, company, readAt: new Date().toISOString(),
    referenced: ids.size, found: Object.keys(items).length, missing: [...ids].filter((id) => !items[id]).sort() }, items }, null, 2));
  return { file, referenced: ids.size, found: Object.keys(items).length };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args.splice(i, 2)[1]; };
  const connection = flag('connection', 'data/local/connection.local.json');
  const company = flag('company', 'usmf').toLowerCase();
  const [folder] = args;
  if (!folder) { console.error('Usage: node tools/extract-items.mjs <data-folder> [--connection file] [--company usmf]'); process.exit(1); }
  const fo = await connect(connection);
  console.log(`Reading item names from ${fo.environment}, company ${company}. GET requests only.`);
  const result = await extractItems(fo, folder, company);
  console.log(`Wrote ${result.found} of ${result.referenced} item names to ${result.file}.`);
}
