import test from 'node:test';
import assert from 'node:assert/strict';
import {priceFromTicker,keeperAction} from '../testnet/policy.mjs';
const feed=(over={})=>({price:'80000',bid:'79999.99',ask:'80000.01',time:new Date(100000).toISOString(),...over});
test('oracle scales BTC and rejects stale, future and uncertain quotes',()=>{
 assert.equal(priceFromTicker(feed(),105).price,'80000000000');
 for(const [p,now] of [[feed(),111],[feed(),97],[feed({ask:'82000'}),100],[{},100]]) assert.throws(()=>priceFromTicker(p,now));
});
const s={price:80000,price_at:100};
const p={entry:0,open:{from:10,until:30,min:79000,max:81000}};
test('keeper respects block windows and cancels expired entries even during outage',()=>{
 assert.equal(keeperAction(p,s,9,100),null);
 assert.equal(keeperAction(p,s,10,100),'fill_open');
 assert.equal(keeperAction(p,s,11,120),null);
 assert.equal(keeperAction(p,s,31,120),'cancel_open');
 assert.equal(keeperAction(p,{...s,price:82000},11,100),null);
});
test('keeper only settles requested exits, cap triggers or expiry with fresh prices',()=>{
 const pos={...p,entry:80000,leverage:1000,opened_at:90};
 assert.equal(keeperAction(pos,s,20,100),null);
 assert.equal(keeperAction({...pos,close:p.open},s,20,100),'settle');
 assert.equal(keeperAction(pos,{...s,price:80080},20,100),'settle');
 assert.equal(keeperAction(pos,{...s,price:79920},20,100),'settle');
 assert.equal(keeperAction({...pos,close:p.open},s,20,120),null);
});
test('new request schema requires a later oracle observation and rejects future prices',()=>{
 const pending={...p,open:{...p.open,after_sequence:7,requested_at:100}};
 assert.equal(keeperAction(pending,{...s,sequence:7},12,102),null);
 assert.equal(keeperAction(pending,{...s,sequence:8},12,102),null);
 assert.equal(keeperAction(pending,{...s,sequence:8,price_at:101},12,102),'fill_open');
 assert.equal(keeperAction(pending,{...s,sequence:8,price_at:103},12,102),null);
});
