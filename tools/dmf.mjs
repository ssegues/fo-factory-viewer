// Reader for D365FO Data Management (DMF) export packages in XML format.
// Each file is <Document><ENTITYNAME><FIELD>value</FIELD>…</ENTITYNAME>…</Document> with flat records.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ENTITIES = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&amp;': '&' };
const decode = (text) => text.replace(/&(?:lt|gt|quot|apos|amp);/g, (m) => ENTITIES[m]).replace(/&#(x?)([0-9a-fA-F]+);/g, (_, hex, code) => String.fromCodePoint(parseInt(code, hex ? 16 : 10)));

/** Parses one DMF XML file into an array of flat records keyed by the upper-case field names. */
export function parseRecords(xml) {
  const body = xml.slice(xml.indexOf('<Document>') + 10);
  const records = [];
  const record = /<([A-Z0-9_]+)>([\s\S]*?)<\/\1>/g;
  const field = /<([A-Z0-9_]+)(?:\s*\/>|>([\s\S]*?)<\/\1>)/g;
  for (const match of body.matchAll(record)) {
    const row = {};
    for (const f of match[2].matchAll(field)) row[f[1]] = decode(f[2] ?? '');
    records.push(row);
  }
  return records;
}

/** Loads the named entity files from an extracted package folder. Missing files yield empty arrays. */
export async function loadPackage(folder, names) {
  const present = new Set(await readdir(folder));
  const out = {};
  for (const name of names) {
    const file = `${name}.xml`;
    out[name] = present.has(file) ? parseRecords(await readFile(join(folder, file), 'utf8')) : [];
  }
  return out;
}

export const yes = (value) => value === 'Yes';
export const number = (value) => (value === '' || value == null ? null : Number(value));
/** DMF dates are local timestamps without offset; an all-1900 "to" date means open-ended. */
export function effective(row, on, from = 'VALIDFROM', to = 'VALIDTO') {
  const start = row[from]?.slice(0, 10) ?? '', end = row[to]?.slice(0, 10) ?? '';
  return (!start || start <= on) && (!end || end.startsWith('1900') || end >= on);
}
