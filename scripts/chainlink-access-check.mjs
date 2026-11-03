import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash, createHmac } from 'node:crypto';

// Credentials remain local. Never print headers, request signing strings or response bodies.
const root = new URL('../.local/', import.meta.url);
let credentials;
try { credentials = JSON.parse(await readFile(new URL('chainlink-credentials.json', root), 'utf8')); }
catch { console.error('Save Data Streams credentials with chainlink-key-setup.mjs first.'); process.exit(1); }
const { key, secret, environment } = credentials;
if (!key || !secret || !['mainnet', 'testnet'].includes(environment)) throw new Error('Invalid credential configuration');
const host = environment === 'mainnet' ? 'https://api.dataengine.chain.link' : 'https://api.testnet-dataengine.chain.link';
async function request(path) {
  const timestamp = String(Date.now());
  const bodyHash = createHash('sha256').update('').digest('hex');
  const signature = createHmac('sha256', secret).update(`GET ${path} ${bodyHash} ${key} ${timestamp}`).digest('hex');
  const started = Date.now();
  const response = await fetch(host + path, { headers: { Authorization: key, 'X-Authorization-Timestamp': timestamp, 'X-Authorization-Signature-SHA256': signature }, redirect: 'error', signal: AbortSignal.timeout(15000) });
  let body; try { body = await response.json(); } catch { body = null; }
  return { status: response.status, elapsedMs: Date.now() - started, body };
}
try {
  const feed = process.argv[2];
  if (feed && !/^0x[0-9a-fA-F]{64}$/.test(feed)) throw new Error('Expected a 32-byte feed ID');
  const path = feed ? `/api/v1/reports/latest?feedID=${feed}` : '/api/v1/discovery?status=live';
  const result = await request(path);
  await mkdir(root, { recursive: true, mode: 0o700 });
  await writeFile(new URL(feed ? 'chainlink-report.json' : 'chainlink-discovery.json', root), JSON.stringify(result.body), { mode: 0o600 });
  console.log(JSON.stringify({ environment, kind: feed ? 'latest-report' : 'discovery', status: result.status, elapsedMs: result.elapsedMs, savedLocally: true, onchainVerified: false }));
  if (!feed) console.log('Discovery is not a report-entitlement check. Select an active BTC/USD feed, then rerun with its feed ID.');
  if (result.status !== 200) process.exitCode = 1;
} catch {
  console.error('Access check failed. No credential or response contents were logged. Check network, configuration and local clock.');
  process.exitCode = 1;
}
