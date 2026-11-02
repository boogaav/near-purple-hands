import { client, ids } from '../scripts/testnet-client.mjs';
import { priceFromTicker, keeperAction } from './policy.mjs';
import { mkdir, appendFile, writeFile, open, unlink } from 'node:fs/promises';
const dir = new URL('../.local/testnet-runtime/', import.meta.url);
await mkdir(dir, {recursive:true, mode:0o700});
const lock = new URL('worker.lock', dir);
let fd;
try {fd=await open(lock,'wx');} catch(e) {
 if(e.code!=='EEXIST') throw e;
 const {readFile}=await import('node:fs/promises');
 const pid=Number(await readFile(lock,'utf8'));
 if(!Number.isInteger(pid)||pid<=0) throw Error('Invalid worker lock; inspect before restarting');
 try {process.kill(pid,0); throw Error('Worker already running');} catch(e) {if(e.code!=='ESRCH') throw e;}
 await unlink(lock); fd=await open(lock,'wx');
}
await fd.writeFile(String(process.pid));
let connection;
try {connection=await client(['oracle','keeper','guardian']);} catch(e) {await fd.close();await unlink(lock);throw e;}
const {near,state,call}=connection;
let stopping = false;
for (const sig of ['SIGINT','SIGTERM']) process.on(sig, () => {stopping = true;});
const log = async row => {
  const line = JSON.stringify({at:new Date().toISOString(), ...row});
  console.log(line);
  await appendFile(new URL('events.jsonl', dir), line+'\n');
};
async function send(role, method, args) {
  const r = await call(role, ids.exchange, method, args);
  const events = r.receipts_outcome.flatMap(x => x.outcome.logs || []).filter(x => x.startsWith('EVENT_JSON:')).map(x => JSON.parse(x.slice(11)));
  await log({method, hash:r.transaction.hash, events});
}
try {
  while (!stopping) {
    try {
      const b = await near.connection.provider.block({finality:'final'});
      const now = Math.floor(Number(b.header.timestamp_nanosec)/1e9);
      const response = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker', {signal:AbortSignal.timeout(6000)});
      if (!response.ok) throw Error(`Price source HTTP ${response.status}`);
      const quote = priceFromTicker(await response.json(), now);
      let s = await state();
      if (quote.timestamp > s.price_at) await send('oracle','publish_price',{...quote,sequence:s.sequence+1});
      s = await state();
      if (Date.now()/1000-s.price_at>15) throw Error('Published oracle stale');
      // Only this explicitly started testnet worker enables new entries.
      if (s.paused) await send('guardian','pause_entries',{paused:false});
      for (const [owner,p] of Object.entries(s.positions)) {
        const block = await near.connection.provider.block({finality:'final'});
        const method = keeperAction(p,s,block.header.height,Math.floor(Number(block.header.timestamp_nanosec)/1e9));
        if (method) { try { await send('keeper',method,{owner}); } catch(e) { await log({error:e.message,owner,method}); } }
      }
      for (const [owner,a] of Object.entries(s.accounts)) {
        if (a.redemption && a.redemption.ready_at <= now && !Object.keys(s.positions).length) await send('keeper','process_remove',{owner});
      }
      await writeFile(new URL('health.json',dir),JSON.stringify({ok:true,at:Date.now(),priceAt:s.price_at}));
    } catch(e) {
      await log({error:e.message});
      await writeFile(new URL('health.json',dir),JSON.stringify({ok:false,at:Date.now(),error:e.message}));
      try {if (!(await state()).paused) await send('guardian','pause_entries',{paused:true});} catch(e) {await log({error:'Pause failed: '+e.message});}
    }
    if (process.argv.includes('--once')) break;
    await new Promise(r=>setTimeout(r,1500));
  }
} finally {
  try {await send('guardian','pause_entries',{paused:true});} finally {await fd.close();await unlink(lock);}
}
