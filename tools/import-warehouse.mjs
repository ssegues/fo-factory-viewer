// Converts an extracted D365FO Data Management package of warehouse setup (XML) into warehouses.json.
//
//   node tools/import-warehouse.mjs <package-folder> <output-folder>
//
// Only structure is read: locations with their zone, profile and type, and fixed product locations.
// Aisle, rack, shelf and bin are taken from the location when it states them; otherwise they are parsed
// from the location ID where it follows a recognised format, and `positionFrom` says which it was.
// Stock and warehouse work are not part of this package.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadPackage, yes } from './dmf.mjs';

const [source, target] = process.argv.slice(2);
if (!source || !target) { console.error('Usage: node tools/import-warehouse.mjs <package-folder> <output-folder>'); process.exit(1); }

const P = await loadPackage(source, ['Warehouse locations', 'Warehouse location profiles', 'Warehouse zones', 'Fixed product locations V2']);
const profiles = Object.fromEntries(P['Warehouse location profiles'].map((p) => [p.PROFILEID, { name: p.PROFILENAME, type: p.WAREHOUSELOCATIONTYPEID || null, licensePlates: yes(p.USELICENSEPLATETRACKING), mixedItems: yes(p.ISLOCATIONALLOWINGMIXEDITEMS) }]));
const zones = Object.fromEntries(P['Warehouse zones'].map((z) => [z.ZONEID, { name: z.ZONENAME, group: z.WAREHOUSEZONEGROUPID || null }]));
const fixed = {};
for (const f of P['Fixed product locations V2']) (fixed[`${f.WAREHOUSEID}/${f.WAREHOUSELOCATIONID}`] ??= []).push(f.ITEMNUMBER);

const FORMATS = [/^(\w{2})A(\d{2})R(\d+)S(\d+)B$/, /^(\d{2})-(\d{2})-(\d+)-(\d+)$/];
function position(l) {
  const stated = [l.WAREHOUSEAISLEID || l.WHSAISLEID, l.RACKID, l.SHELFID, l.BINID];
  for (const format of FORMATS) {
    const m = format.exec(l.WAREHOUSELOCATIONID);
    if (!m) continue;
    // Format "aisle A rack R shelf S bin B" numbers the bin after the shelf; "aisle-rack-shelf-bin" states it last.
    return { aisle: m[1], rack: Number(m[2]), shelf: Number(m[3]), bin: Number(m[4]), positionFrom: 'location-id' };
  }
  if (stated[0] && Number(stated[1]) > 0) return { aisle: stated[0], rack: Number(stated[1]), shelf: Number(stated[2]) || 1, bin: Number(stated[3]) || 1, positionFrom: 'location-fields' };
  return { positionFrom: null };
}
const ROLES = { ISDEFAULTRECEIPTWAREHOUSELOCATION: 'receipt', ISDEFAULTISSUEWAREHOUSELOCATION: 'issue', ISDEFAULTPRODUCTIONINPUTWAREHOUSELOCATION: 'productionInput',
  ISDEFAULTPRODUCTIONFINISHEDGOODSWAREHOUSELOCATION: 'productionOutput', ISDEFAULTFINALSHIPMENTWAREHOUSELOCATION: 'finalShipment', ISDEFAULTSORTINGWAREHOUSELOCATION: 'sorting' };

const byWarehouse = {};
for (const l of P['Warehouse locations']) {
  const profile = profiles[l.WAREHOUSELOCATIONPROFILEID];
  (byWarehouse[l.WAREHOUSEID] ??= []).push({
    id: l.WAREHOUSELOCATIONID, zoneId: l.WAREHOUSEZONEID || null, profileId: l.WAREHOUSELOCATIONPROFILEID || null, type: profile?.type ?? null,
    ...position(l), defaultFor: Object.entries(ROLES).filter(([field]) => yes(l[field])).map(([, role]) => role),
    fixedItems: fixed[`${l.WAREHOUSEID}/${l.WAREHOUSELOCATIONID}`] ?? [],
  });
}
const warehouses = Object.entries(byWarehouse).map(([id, locations]) => ({ id, advanced: locations.some((l) => l.profileId), locations }))
  .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

const result = { meta: { source: 'dmf-package', extractedAt: new Date().toISOString(), warehouses: warehouses.length, locations: P['Warehouse locations'].length,
  note: 'Structure only. Warehouse names, stock by location and warehouse work are not in this package.' }, zones, profiles, warehouses };
await mkdir(target, { recursive: true });
await writeFile(join(target, 'warehouses.json'), JSON.stringify(result));
console.log(`Wrote ${join(target, 'warehouses.json')}: ${warehouses.length} warehouses, ${result.meta.locations} locations`);
for (const w of warehouses) console.log(`  ${w.id.padEnd(8)} ${String(w.locations.length).padStart(5)} locations${w.advanced ? '' : '  (no location profiles)'}`);
