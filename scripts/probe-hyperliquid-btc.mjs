// Read-only mainnet probe for the proposed BTC benchmark.
import assert from 'node:assert/strict';
const endpoint = 'https://api.hyperliquid.xyz/info';
const response = await fetch(endpoint, {method:'POST', headers:{'content-type':'application/json'},
  body:JSON.stringify({type:'l2Book',coin:'BTC'}), signal:AbortSignal.timeout(6000)});
assert(response.ok, 'Hyperliquid book unavailable');
const book = await response.json();
const bid = Number(book.levels[0][0].px);
const ask = Number(book.levels[1][0].px);
const ageMs = Date.now() - book.time;
assert(book.coin === 'BTC' && Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask >= bid);
assert(Number.isSafeInteger(book.time) && ageMs >= -1000 && ageMs <= 5000, 'Stale BTC book');
const midpoint = (bid + ask) / 2;
console.log(JSON.stringify({endpoint,observedAt:new Date(book.time).toISOString(),bid,ask,midpoint,
  spreadBps:(ask-bid)*10000/midpoint,ageMs,proofVerifiedOnNear:false}));
