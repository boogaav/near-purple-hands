import http from 'node:http';
import {createBlockFeed} from './block-feed.mjs';
import { readFile } from 'node:fs/promises';
import { client, ids } from '../scripts/testnet-client.mjs';
const {near,state} = await client(); // Read only: this process loads no keys.
const feed=createBlockFeed(ids.exchange);
let cached, updated=0;
async function snapshot() {
 const s=await state(); const b=await near.connection.provider.block({finality:'final'});
 let health={ok:false}, rows=[];
 try {health=JSON.parse(await readFile(new URL('../.local/testnet-runtime/health.json',import.meta.url)));} catch {}
 try {rows=(await readFile(new URL('../.local/testnet-runtime/events.jsonl',import.meta.url),'utf8')).trim().split('\n').map(x=>JSON.parse(x));} catch {}
 const history=rows.flatMap(r=>(r.events||[]).filter(e=>e.event==='settled').flatMap(e=>e.data.map(d=>({...d,hash:r.hash})))).reverse();
 const liabilities=Object.values(s.accounts).reduce((n,a)=>n+a.balance,0)+Object.values(s.positions).reduce((n,p)=>n+p.margin+p.escrow+(!p.entry?p.fee:0),0)+s.capital+s.treasury;
 return {ok:true,state:s,block:b.header.height,history,invariant:s.total===liabilities,worker:health.ok&&Date.now()-health.at<20000,ids};
}
let updating;
const get=()=>updating ||= snapshot().then(x=>{cached=x;updated=Date.now();return x;}).finally(()=>updating=null);
http.createServer(async(req,res)=>{
 try {
  if(!['127.0.0.1:8892','localhost:8892'].includes(req.headers.host)) {res.writeHead(403);return res.end();}
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') {res.writeHead(405);return res.end();}
  if(req.url==='/api/blocks') return feed.subscribe(req,res);
  if(req.url==='/api/chart-health') {res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(feed.status()));}
  if(req.url==='/api/state') {res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(Date.now()-updated<2000?cached:await get()));}
  res.writeHead(404);res.end();
 }catch(e){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error:e.message}));}
}).listen(8892,'127.0.0.1',()=>console.log('Read-only testnet API on localhost:8892'));
