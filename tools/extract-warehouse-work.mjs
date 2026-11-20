// Reads warehouse work headers and lines for one company from the ERP (GET only) and merges them into
// an existing warehouses.json, replacing the work that was there.
//
//   node tools/extract-warehouse-work.mjs <data-folder> [--connection data/local/connection.local.json] [--company usmf]
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { connect } from './fo-client.mjs';
import { mergeWork, upperKeys } from './warehouse-work.mjs';
import { extractItems } from './extract-items.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args.splice(i, 2)[1]; };
const connection = flag('connection', 'data/local/connection.local.json');
const company = flag('company', 'usmf').toLowerCase();
const [folder] = args;
if (!folder) { console.error('Usage: node tools/extract-warehouse-work.mjs <data-folder> [--connection file] [--company usmf]'); process.exit(1); }

const file = join(folder, 'warehouses.json');
const data = JSON.parse(await readFile(file, 'utf8'));
const fo = await connect(connection);
console.log(`Reading warehouse work from ${fo.environment} (${fo.origin}), company ${company}. GET requests only.`);
const inCompany = `dataAreaId eq '${company}'`;
async function get(name, select) {
  try { return await fo.read(name, { filter: inCompany, select, limit: 100_000 }); }
  catch (error) { console.error(`${name}: HTTP ${error.status ?? '?'} ${error.detail ?? error.message}`); process.exit(2); }
}
const headers = await get('WarehouseWorkHeaders', ['WarehouseWorkId', 'WarehouseId', 'WarehouseWorkOrderType', 'WarehouseWorkStatus', 'SourceOrderNumber', 'WarehouseWorkPriority',
  'WaveId', 'LoadId', 'WarehouseWorkPoolId', 'WarehouseWorkProcessingStartDateTime', 'WarehouseWorkClosedDateTime', 'WarehouseWorkCancelledDateTime']);
const lines = await get('WarehouseWorkLines', ['WarehouseWorkId', 'WorkLineNumber', 'WarehouseWorkType', 'WarehouseWorkStatus', 'ItemNumber', 'WorkQuantity',
  'WorkQuantityUnitSymbol', 'WarehouseId', 'WarehouseLocationId', 'LicensePlateNumber']);
const summary = mergeWork(data, headers.map(upperKeys), lines.map(upperKeys), { source: 'odata', environment: fo.environment, company, readAt: new Date().toISOString() });
await writeFile(file, JSON.stringify(data));
console.log(`Merged ${summary.headers} work orders (${summary.lines} lines) into ${file}; ${summary.unplacedLines} line(s) without a known location.`);
for (const [id, n] of Object.entries(summary.byWarehouse)) console.log(`  ${id.padEnd(8)} ${n} work order(s)`);

// Item names for product icons, for the items this data set now refers to. A failure here keeps what was merged above.
try { const r = await extractItems(fo, folder, company); console.log(`Item names: ${r.found} of ${r.referenced} in ${r.file}.`); }
catch (error) { console.log(`Item names not refreshed: ${error.message}`); }
