// Read-only OData client for Dynamics 365 Finance & Operations.
// It can only issue GET requests, only to the configured environment, and never prints credentials.
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** Decrypts a client secret stored with Export-Clixml (Windows DPAPI, current user). The value stays in memory. */
async function readSecret(path) {
  if (process.platform !== 'win32') throw new Error('The encrypted credential requires Windows DPAPI.');
  const script = "$ErrorActionPreference='Stop'; $s=Import-Clixml -LiteralPath $env:FO_SECRET_PATH; if($s -isnot [Security.SecureString]){exit 1}; [Console]::Write([Net.NetworkCredential]::new('', $s).Password)";
  const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, FO_SECRET_PATH: path }, windowsHide: true });
  if (!stdout) throw new Error('The encrypted credential could not be read for this Windows account.');
  return stdout;
}

export async function connect(configPath) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const origin = new URL(config.financeOperationsUrl).origin;
  if (!origin.startsWith('https://')) throw new Error('The environment URL must use HTTPS.');
  let token = null;
  async function accessToken() {
    if (token && token.expires > Date.now() + 60_000) return token.value;
    const body = new URLSearchParams({ client_id: config.clientId, client_secret: await readSecret(config.authentication.secretFile), grant_type: 'client_credentials', scope: `${origin}/.default` });
    const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, { method: 'POST', body });
    const json = await response.json();
    if (!response.ok || typeof json.access_token !== 'string') throw new Error(`Authentication failed (${response.status}): ${json.error ?? 'unknown error'}`);
    token = { value: json.access_token, expires: Date.now() + (json.expires_in ?? 3000) * 1000 };
    return token.value;
  }

  /** GETs one entity collection, following server paging up to `limit` rows. */
  async function read(collection, { filter, select, limit = 5000, crossCompany = true, top } = {}) {
    const url = new URL(`/data/${collection}`, origin);
    if (crossCompany) url.searchParams.set('cross-company', 'true');
    if (top) url.searchParams.set('$top', String(top));
    if (filter) url.searchParams.set('$filter', filter);
    if (select) url.searchParams.set('$select', select.join(','));
    const rows = [];
    let next = url.toString();
    while (next) {
      if (new URL(next).origin !== origin) throw new Error('Refusing to follow a link outside the configured environment.');
      const response = await fetch(next, { method: 'GET', headers: { Authorization: `Bearer ${await accessToken()}`, Accept: 'application/json', Prefer: 'odata.maxpagesize=1000' } });
      if (!response.ok) {
        // Keep the server's own explanation (OData error message); it never contains the token.
        const text = await response.text().catch(() => '');
        let detail = text.slice(0, 400);
        try { const body = JSON.parse(text); detail = body.error?.message ?? body.Message ?? detail; } catch { /* not JSON */ }
        const error = new Error(`${collection}: HTTP ${response.status}`); error.status = response.status; error.detail = detail; throw error;
      }
      if (top) { const page = await response.json(); rows.push(...page.value); break; }
      const page = await response.json();
      rows.push(...page.value);
      if (rows.length > limit) throw new Error(`${collection}: more than ${limit} rows; narrow the filter.`);
      next = page['@odata.nextLink'] ?? null;
    }
    return rows;
  }
  return { origin, environment: config.environmentName, read };
}
