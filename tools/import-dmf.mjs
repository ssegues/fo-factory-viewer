// Converts an extracted D365FO Data Management package (XML) into a viewer snapshot.
//
//   node tools/import-dmf.mjs <package-folder> <output-folder> [--site 1] [--company USMF] [--date 2026-11-13]
//
// Nothing is inferred beyond what the package states. Where an operation names a capability or a
// resource type instead of a resource, the eligible resources are resolved the way the ERP relates them:
// effective group membership at the site, plus effective capability assignments.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { effective, loadPackage, number, yes } from './dmf.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args.splice(i, 2)[1]; };
const site = flag('site', '1');
const company = flag('company', 'USMF');
const date = flag('date', new Date().toISOString().slice(0, 10));
const [source, target] = args;
if (!source || !target) { console.error('Usage: node tools/import-dmf.mjs <package-folder> <output-folder> [--site 1] [--company USMF] [--date YYYY-MM-DD]'); process.exit(1); }

const P = await loadPackage(source, [
  'Production units', 'Resource groups', 'Resource group membership', 'Operations resource',
  'Operations resource capability assignment', 'Resource calendar assignments', 'Resource group calendar assignments',
  'Operations', 'Route headers', 'Route versions V2', 'Route operations V2', 'Route operation properties V2',
  'Resource requirements for route operation properties',
  'Bill of materials versions V4', 'Bill of materials lines V3',
]);
const warnings = [];
const place = (warehouseId, locationId) => (warehouseId || locationId ? { warehouseId: warehouseId || null, locationId: locationId || null } : null);

// ---- structure
const productionUnits = P['Production units'].filter((u) => u.OPERATIONALSITEID === site).map((u) => ({ id: u.PRODUCTIONUNITID, name: u.NAME }));
const groupRows = P['Resource groups'].filter((g) => g.OPERATIONALSITEID === site);
const groupCalendar = Object.fromEntries(P['Resource group calendar assignments'].filter((c) => effective(c, date)).map((c) => [c.OPERATIONSRESOURCEGROUPID ?? c.GROUPID, c.WORKCALENDARID]));
const resourceGroups = groupRows.map((g) => ({
  id: g.GROUPID, name: g.GROUPNAME, productionUnitId: g.PRODUCTIONUNITID || null, isWorkCell: yes(g.ISWORKCELL), calendarId: groupCalendar[g.GROUPID] ?? null,
  // Where the group receives components and where it leaves its output, as set on the resource group.
  input: place(g.INPUTWAREHOUSEID, g.INPUTWAREHOUSELOCATIONID), output: place(g.OUTPUTWAREHOUSEID, g.OUTPUTWAREHOUSELOCATIONID),
}));
if (resourceGroups.some((g) => !g.productionUnitId)) { productionUnits.push({ id: '(none)', name: 'No production unit' }); resourceGroups.forEach((g) => { g.productionUnitId ??= '(none)'; }); }

const siteGroups = new Set(resourceGroups.map((g) => g.id));
const membership = {};
for (const m of P['Resource group membership']) {
  if (!effective(m, date) || !siteGroups.has(m.OPERATIONSRESOURCEGROUPID)) continue;
  if (membership[m.OPERATIONSRESOURCEID]) warnings.push(`Resource ${m.OPERATIONSRESOURCEID} has more than one effective group at site ${site}; kept ${membership[m.OPERATIONSRESOURCEID]}.`);
  else membership[m.OPERATIONSRESOURCEID] = m.OPERATIONSRESOURCEGROUPID;
}
const capabilityRows = P['Operations resource capability assignment'].filter((c) => effective(c, date));
const capabilitiesOf = {};
for (const c of capabilityRows) (capabilitiesOf[c.OPERATIONSRESOURCEID] ??= []).push({ name: c.OPERATIONSRESOURCECAPABILITYNAME, level: number(c.LEVEL) ?? 0, priority: number(c.PRIORITY) ?? 0 });
const calendarOf = Object.fromEntries(P['Resource calendar assignments'].filter((c) => effective(c, date)).map((c) => [c.OPERATIONSRESOURCEID, c.WORKCALENDARID]));

const resources = P['Operations resource'].filter((r) => membership[r.RESOURCEID]).map((r) => ({
  id: r.RESOURCEID, name: r.RESOURCENAME, type: r.OPERATIONSRESOURCETYPE, groupId: membership[r.RESOURCEID],
  efficiency: number(r.EFFICIENCYPERCENTAGE), capacity: number(r.CAPACITY), capacityUnit: r.CAPACITYUNIT,
  finiteCapacity: yes(r.HASFINITESCHEDULINGCAPACITY), bottleneck: yes(r.ISBOTTLENECKRESOURCE), exclusive: yes(r.ISEXCLUSIVERESOURCE),
  capabilities: (capabilitiesOf[r.RESOURCEID] ?? []).map((c) => c.name), calendarId: calendarOf[r.RESOURCEID] ?? null,
  vendorAccount: r.VENDORACCOUNTNUMBER || null,
}));
const unassigned = P['Operations resource'].filter((r) => !membership[r.RESOURCEID]);

// ---- routes
const operationName = Object.fromEntries(P['Operations'].map((o) => [o.OPERATIONID, o.OPERATIONNAME || o.OPERATIONID]));
const routeName = Object.fromEntries(P['Route headers'].map((r) => [r.ROUTEID, r.ROUTENAME]));
/** Most specific rows for an operation relation: route + item + site beats partial matches, which beat the general row. */
function mostSpecific(rows, operationId, routeId, item) {
  let best = -1, picked = [];
  for (const row of rows) {
    if ((row.OPERATIONID ?? row.ROUTEOPERATIONID) !== operationId) continue;
    if ((row.ROUTEID && row.ROUTEID !== routeId) || (row.ITEMNUMBER && row.ITEMNUMBER !== item) || (row.PRODUCTIONSITEID && row.PRODUCTIONSITEID !== site)) continue;
    const score = (row.ROUTEID ? 4 : 0) + (row.ITEMNUMBER ? 2 : 0) + (row.PRODUCTIONSITEID ? 1 : 0);
    if (score > best) { best = score; picked = [row]; } else if (score === best) picked.push(row);
  }
  return picked;
}
function requirementOf(rows) {
  const req = { resourceId: null, groupId: null, resourceType: null, capabilities: [] };
  for (const r of rows) {
    if (r.REQUIREDOPERATIONSRESOURCEID) req.resourceId = r.REQUIREDOPERATIONSRESOURCEID;
    if (r.REQUIREDOPERATIONSRESOURCEGROUPID) req.groupId = r.REQUIREDOPERATIONSRESOURCEGROUPID;
    if (r.REQUIREDOPERATIONSRESOURCETYPE) req.resourceType = r.REQUIREDOPERATIONSRESOURCETYPE;
    if (r.REQUIREDCAPABILITYNAME) req.capabilities.push({ name: r.REQUIREDCAPABILITYNAME, minimumLevel: number(r.MINIMUMREQUIREDCAPABILITYLEVEL) ?? 0 });
    for (const other of ['REQUIREDSKILLID', 'REQUIREDCOURSEID', 'REQUIREDCERTIFICATETYPE', 'REQUIREDTITLEID']) if (r[other]) (req.other ??= []).push(`${other}=${r[other]}`);
  }
  return req;
}
function eligible(req) {
  return resources.filter((r) => {
    if (req.resourceId && r.id !== req.resourceId) return false;
    if (req.groupId && r.groupId !== req.groupId) return false;
    if (req.resourceType && r.type !== req.resourceType) return false;
    const owned = capabilitiesOf[r.id] ?? [];
    return req.capabilities.every((need) => owned.some((c) => c.name === need.name && c.level >= need.minimumLevel));
  }).map((r) => r.id);
}
function operationOf(row, routeId, item) {
  const props = mostSpecific(P['Route operation properties V2'], row.OPERATIONID, routeId, item)[0] ?? {};
  const requirement = requirementOf(mostSpecific(P['Resource requirements for route operation properties'], row.OPERATIONID, routeId, item));
  const toHours = number(props.OPERATIONSTIMETOHOURCONVERSIONFACTOR) || 1, quantity = number(props.PROCESSQUANTITY) || 1;
  return {
    operationId: row.OPERATIONID, name: operationName[row.OPERATIONID] ?? row.OPERATIONID,
    setupHours: (number(props.SETUPTIME) ?? 0) * toHours, runHoursPerUnit: ((number(props.PROCESSTIME) ?? 0) * toHours) / quantity,
    resourceQuantity: number(props.RESOURCEQUANTITY) ?? 1, costingResourceId: props.COSTINGOPERATIONRESOURCEID || null,
    requirement, eligibleResourceIds: eligible(requirement),
  };
}
const routes = [];
for (const version of P['Route versions V2']) {
  if (version.PRODUCTIONSITEID !== site || !yes(version.ISACTIVE) || !yes(version.ISAPPROVED)) continue;
  const rows = P['Route operations V2'].filter((o) => o.ROUTEID === version.ROUTEID);
  const operations = rows.filter((o) => o.OPERATIONPRIORITY === 'Primary').sort((a, b) => Number(a.OPERATIONNUMBER) - Number(b.OPERATIONNUMBER)).map((row) => ({
    number: Number(row.OPERATIONNUMBER), next: Number(row.NEXTROUTEOPERATIONNUMBER) || null, ...operationOf(row, version.ROUTEID, version.ITEMNUMBER),
    secondary: rows.filter((o) => o.OPERATIONNUMBER === row.OPERATIONNUMBER && o.OPERATIONPRIORITY !== 'Primary').map((s) => ({ priority: s.OPERATIONPRIORITY, ...operationOf(s, version.ROUTEID, version.ITEMNUMBER) })),
  }));
  for (const op of operations) if (!op.eligibleResourceIds.length) warnings.push(`Route ${version.ROUTEID} op ${op.number} (${op.operationId}): no eligible resource at site ${site}.`);
  routes.push({ id: version.ROUTEID, name: routeName[version.ROUTEID] || version.VERSIONNAME, productId: version.ITEMNUMBER, versionName: version.VERSIONNAME, operations });
}

// ---- bills of materials for the routed products
const products = new Set(routes.map((r) => r.productId));
const boms = [];
for (const version of P['Bill of materials versions V4']) {
  const item = version.MANUFACTUREDITEMNUMBER ?? version.ITEMNUMBER;
  if (!products.has(item) || !yes(version.ISACTIVE) || (version.PRODUCTIONSITEID && version.PRODUCTIONSITEID !== site)) continue;
  boms.push({ id: version.BOMID, productId: item, siteSpecific: Boolean(version.PRODUCTIONSITEID), lines: P['Bill of materials lines V3'].filter((l) => l.BOMID === version.BOMID).map((l) => ({
    itemNumber: l.ITEMNUMBER, quantity: number(l.QUANTITY), per: number(l.QUANTITYDENOMINATOR) || 1, unit: l.PRODUCTUNITSYMBOL, operationNumber: Number(l.ROUTEOPERATIONNUMBER) || null, lineType: l.LINETYPE,
    warehouseId: l.CONSUMPTIONWAREHOUSEID || null, resourceConsumption: yes(l.ISRESOURCECONSUMPTIONUSED),
  })) });
}

const snapshot = {
  meta: { source: 'dmf-package', company, site, effectiveDate: date, extractedAt: new Date().toISOString(),
    counts: { productionUnits: productionUnits.length, resourceGroups: resourceGroups.length, resources: resources.length, routes: routes.length, boms: boms.length },
    resourcesWithoutGroup: unassigned.length, warnings },
  productionUnits, resourceGroups, resources, routes, boms, productionOrders: [],
};
// Orders come from a separate OData read; re-importing the structure keeps the ones already merged.
try {
  const previous = JSON.parse(await readFile(join(target, 'snapshot.json'), 'utf8'));
  if (previous.meta?.company === company && previous.meta?.site === site && previous.productionOrders?.length) { snapshot.productionOrders = previous.productionOrders; snapshot.meta.orders = previous.meta.orders; }
} catch { /* no earlier snapshot */ }
await mkdir(target, { recursive: true });
await writeFile(join(target, 'snapshot.json'), JSON.stringify(snapshot, null, 2));
console.log(`Wrote ${join(target, 'snapshot.json')}`);
console.log(snapshot.meta.counts, `| resources without a group at any site: ${unassigned.length}`);
if (warnings.length) console.log(`${warnings.length} warning(s):\n  ` + warnings.join('\n  '));
