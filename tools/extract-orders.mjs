// Reads production orders, their route operations and scheduled jobs for one site (GET only)
// and merges them into an existing snapshot.
//
//   node tools/extract-orders.mjs <snapshot-folder> [--connection data/local/connection.local.json] [--company usmf] [--site 1]
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { connect } from './fo-client.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args.splice(i, 2)[1]; };
const connection = flag('connection', 'data/local/connection.local.json');
const company = flag('company', 'usmf').toLowerCase();
const site = flag('site', '1');
const [folder] = args;
if (!folder) { console.error('Usage: node tools/extract-orders.mjs <snapshot-folder> [--connection file] [--company usmf] [--site 1]'); process.exit(1); }

const fo = await connect(connection);
console.log(`Reading from ${fo.environment} (${fo.origin}), company ${company}, site ${site}. GET requests only.`);
const inCompany = `dataAreaId eq '${company}'`;
const report = {};
async function attempt(name, options) {
  try { const rows = await fo.read(name, options); report[name] = { status: 200, rows: rows.length }; return rows; }
  catch (error) { report[name] = { status: error.status ?? 'error', message: error.message }; return null; }
}

const headers = await attempt('ProductionOrderHeaders', { filter: `${inCompany} and ProductionSiteId eq '${site}'`, select: [
  'ProductionOrderNumber', 'ProductionOrderName', 'ItemNumber', 'ProductionOrderStatus', 'ScheduledQuantity', 'StartedQuantity', 'RemainingReportAsFinishedQuantity',
  'SourceRouteId', 'SourceBOMId', 'ProductionSiteId', 'ScheduledStartDate', 'ScheduledStartTime', 'ScheduledEndDate', 'ScheduledEndTime', 'DeliveryDate', 'SchedulingMethod', 'AreRouteJobsGenerated', 'ProductionPoolId', 'ParentProductionOrderNumber' ] });
const operations = await attempt('ProductionOrderRouteOperations', { filter: inCompany, select: [
  'ProductionOrderNumber', 'OperationNumber', 'OperationPriority', 'OperationId', 'NextOperationNumber', 'ScheduledFromDate', 'ScheduledFromTime', 'ScheduledEndDate', 'ScheduledEndTime',
  'ProcessTime', 'ProcessQuantity', 'SetupTime', 'CostingOperationResourceId', 'IsOperationStarted', 'IsOperationCompleted', 'ProcessCompletionPercentage' ] });
const jobs = await attempt('ProductionOrderRouteJobs', { filter: inCompany, select: [
  'JobId', 'ProductionOrderNumber', 'OperationNumber', 'OperationPriority', 'RouteJobType', 'OperationsResourceId', 'ScheduledFromDate', 'ScheduledFromTime', 'ScheduledEndDate', 'ScheduledEndTime',
  'ScheduledJobDurationHours', 'JobStatus', 'IsJobEnded', 'IsJobCancelled', 'JobProcessingPercentage' ] });
console.log(report);
if (!headers) { console.error('Production orders could not be read; the snapshot was left unchanged.'); process.exit(2); }

// F&O returns a date and a seconds-since-midnight time in separate fields.
function stamp(date, seconds) {
  if (!date || date.startsWith('1900')) return null;
  const s = Number(seconds) || 0, pad = (n) => String(n).padStart(2, '0');
  return `${date.slice(0, 10)}T${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
const wanted = new Set(headers.map((h) => h.ProductionOrderNumber));
const by = (rows, order) => (rows ?? []).filter((r) => r.ProductionOrderNumber === order);
const productionOrders = headers.map((h) => ({
  id: h.ProductionOrderNumber, name: h.ProductionOrderName, productId: h.ItemNumber, status: h.ProductionOrderStatus,
  quantity: h.ScheduledQuantity, startedQuantity: h.StartedQuantity, remainingQuantity: h.RemainingReportAsFinishedQuantity,
  routeId: h.SourceRouteId || null, bomId: h.SourceBOMId || null, pool: h.ProductionPoolId || null, parentOrder: h.ParentProductionOrderNumber || null,
  schedulingMethod: h.SchedulingMethod, jobsGenerated: h.AreRouteJobsGenerated,
  scheduledStart: stamp(h.ScheduledStartDate, h.ScheduledStartTime), scheduledEnd: stamp(h.ScheduledEndDate, h.ScheduledEndTime), deliveryDate: h.DeliveryDate?.slice(0, 10) ?? null,
  operations: by(operations, h.ProductionOrderNumber).map((o) => ({
    number: o.OperationNumber, priority: o.OperationPriority, operationId: o.OperationId, next: o.NextOperationNumber || null,
    scheduledStart: stamp(o.ScheduledFromDate, o.ScheduledFromTime), scheduledEnd: stamp(o.ScheduledEndDate, o.ScheduledEndTime),
    costingResourceId: o.CostingOperationResourceId || null, started: o.IsOperationStarted, completed: o.IsOperationCompleted,
  })).sort((a, b) => a.number - b.number),
  jobs: by(jobs, h.ProductionOrderNumber).map((j) => ({
    id: j.JobId, operation: j.OperationNumber, priority: j.OperationPriority, type: j.RouteJobType, resourceId: j.OperationsResourceId || null,
    start: stamp(j.ScheduledFromDate, j.ScheduledFromTime), end: stamp(j.ScheduledEndDate, j.ScheduledEndTime), hours: j.ScheduledJobDurationHours,
    status: j.JobStatus, ended: j.IsJobEnded, cancelled: j.IsJobCancelled,
  })).sort((a, b) => (a.start ?? '').localeCompare(b.start ?? '')),
}));

const file = join(folder, 'snapshot.json');
const snapshot = JSON.parse(await readFile(file, 'utf8'));
snapshot.productionOrders = productionOrders;
snapshot.meta.orders = { source: 'odata', environment: fo.environment, readAt: new Date().toISOString(), report,
  orders: productionOrders.length, withJobs: productionOrders.filter((o) => o.jobs.length).length, otherSiteRowsIgnored: (jobs ?? []).filter((j) => !wanted.has(j.ProductionOrderNumber)).length };
await writeFile(file, JSON.stringify(snapshot, null, 2));
console.log(`Merged ${productionOrders.length} production orders into ${file} (${snapshot.meta.orders.withJobs} with scheduled jobs).`);
