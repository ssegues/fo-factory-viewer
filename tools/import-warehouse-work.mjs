// Merges warehouse work (headers and lines) from an extracted Data Management package into warehouses.json.
//
//   node tools/import-warehouse-work.mjs <package-folder> <data-folder>
//
// Run tools/import-warehouse.mjs first: work is attached to the warehouses already in the file.
// The same work can be read from the ERP directly with tools/extract-warehouse-work.mjs.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadPackage } from './dmf.mjs';
import { mergeWork } from './warehouse-work.mjs';

const [source, folder] = process.argv.slice(2);
if (!source || !folder) { console.error('Usage: node tools/import-warehouse-work.mjs <package-folder> <data-folder>'); process.exit(1); }
const file = join(folder, 'warehouses.json');
const data = JSON.parse(await readFile(file, 'utf8'));
const P = await loadPackage(source, ['Warehouse work headers', 'Warehouse work lines']);
const summary = mergeWork(data, P['Warehouse work headers'], P['Warehouse work lines'], { source: 'dmf-package', readAt: new Date().toISOString() });
await writeFile(file, JSON.stringify(data));
console.log(`Merged ${summary.headers} work orders (${summary.lines} lines) into ${file}; ${summary.unplacedLines} line(s) without a known location.`);
for (const [id, n] of Object.entries(summary.byWarehouse)) console.log(`  ${id.padEnd(8)} ${n} work order(s)`);
if (summary.warehousesNotInStructure.length) console.log(`Warehouses not in the structure file: ${summary.warehousesNotInStructure.join(', ')}`);
