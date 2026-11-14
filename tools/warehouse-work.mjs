// Shared mapping of warehouse work (headers and lines) into warehouses.json, used by the Data management
// import and by the OData read. Rows are keyed by the upper-case field names a Data management package uses;
// OData rows are converted with `upperKeys` first (the entity field names are the same, in another case).
import { number } from './dmf.mjs';

export const upperKeys = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toUpperCase(), v == null ? '' : String(v)]));

/** Attaches the work to the warehouses in `data` (in place) and records `meta.work`. Returns a short summary. */
export function mergeWork(data, headers, lines, source) {
  const stamp = (value) => (!value || value.startsWith('1900') ? null : value.replace(/Z$/, ''));
  const linesOf = {};
  for (const l of lines) (linesOf[l.WAREHOUSEWORKID] ??= []).push(l);
  const byWarehouse = {};
  for (const h of headers) {
    const warehouse = data.warehouses.find((w) => w.id === h.WAREHOUSEID);
    // Location IDs are matched without regard to case, as the ERP does.
    const known = new Map((warehouse?.locations ?? []).map((l) => [l.id.toLowerCase(), l.id]));
    (byWarehouse[h.WAREHOUSEID] ??= []).push({
      id: h.WAREHOUSEWORKID, orderType: h.WAREHOUSEWORKORDERTYPE, status: h.WAREHOUSEWORKSTATUS, sourceOrder: h.SOURCEORDERNUMBER || null,
      priority: number(h.WAREHOUSEWORKPRIORITY), waveId: h.WAVEID || null, loadId: h.LOADID || null, poolId: h.WAREHOUSEWORKPOOLID || null,
      started: stamp(h.WAREHOUSEWORKPROCESSINGSTARTDATETIME), closed: stamp(h.WAREHOUSEWORKCLOSEDDATETIME), cancelled: stamp(h.WAREHOUSEWORKCANCELLEDDATETIME),
      lines: (linesOf[h.WAREHOUSEWORKID] ?? []).sort((a, b) => number(a.WORKLINENUMBER) - number(b.WORKLINENUMBER)).map((l) => {
        const raw = (l.WAREHOUSELOCATIONID ?? '').trim().toLowerCase();
        // A line without a known location is kept, with `located: false`, so the viewer can say what it could not place.
        return { line: number(l.WORKLINENUMBER), type: l.WAREHOUSEWORKTYPE, status: l.WAREHOUSEWORKSTATUS, itemNumber: l.ITEMNUMBER || null,
          quantity: number(l.WORKQUANTITY), unit: l.WORKQUANTITYUNITSYMBOL || null, locationId: known.get(raw) ?? (l.WAREHOUSELOCATIONID || null), located: known.has(raw), licensePlate: l.LICENSEPLATENUMBER || null };
      }),
    });
  }
  for (const w of data.warehouses) w.work = byWarehouse[w.id] ?? [];
  const all = Object.values(byWarehouse).flat();
  data.meta.work = { ...source, headers: headers.length, lines: lines.length, unplacedLines: all.flatMap((w) => w.lines).filter((l) => !l.located).length,
    warehousesNotInStructure: Object.keys(byWarehouse).filter((id) => !data.warehouses.some((w) => w.id === id)) };
  return { byWarehouse: Object.fromEntries(Object.entries(byWarehouse).map(([id, list]) => [id, list.length])), ...data.meta.work };
}
