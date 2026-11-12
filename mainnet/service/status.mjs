import {queryNear} from './rpc.mjs';
import {advance,forOwner} from './history.mjs';
import http from 'node:http';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {settlementRows} from './settlements.mjs';
const config=JSON.parse(await readFile(new URL('../config.json',import.meta.url)));
async function query(method,block){
  const {result}=await queryNear({request_type:'call_function',account_id:config.exchange,method_name:method,args_base64:'e30=',...block});
  if(!result?.result)throw Error('NEAR view unavailable');
  return {height:result.block_height,hash:result.block_hash,value:JSON.parse(Buffer.from(result.result))};
}
let observed,archiving=false,collecting=false;
let recent={hash:null,processed:[],rows:[]};
try{recent=JSON.parse(await readFile('/data/recent-settlements.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
async function collect(){
 const operator=JSON.parse(await readFile('/data/operator.json','utf8'));
 let queued=[];try{queued=(await readFile('/data/settlement-transactions.jsonl','utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line).hash);}catch(e){if(e.code!=='ENOENT')throw e;}
 const hashes=[...new Set([...queued,operator.transaction].filter(Boolean))].filter(hash=>hash!==recent.hash&&!(recent.processed||[]).includes(hash));
 for(const hash of hashes.slice(0,8)){
 const res=await fetch('https://free.rpc.fastnear.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tx',params:{tx_hash:hash,sender_account_id:config.exchange,wait_until:'FINAL'}}),signal:AbortSignal.timeout(3500)});
 const {result}=await res.json();if(result?.final_execution_status!=='FINAL')return;
 const rows=settlementRows(result,config.exchange);
 const next={hash,processed:[...(recent.processed||[]),hash],rows:[...rows,...recent.rows].filter((r,i,a)=>a.findIndex(x=>x.id===r.id&&x.owner===r.owner)===i)};
 await writeFile('/data/recent-settlements.tmp',JSON.stringify(next));await rename('/data/recent-settlements.tmp','/data/recent-settlements.json');recent=next;
 }
}
let activityAt=0;
async function poll(){
  try{
    const state=await query('get_state',{finality:'final'});
    const oracle=await query('get_oracle_config',{block_id:state.hash});
    observed={finalizedBlockHeight:state.height,checkedAtMs:Date.now(),lastObservedUs:oracle.value.last_observed_us,maxAgeUs:oracle.value.max_age_us,priceE6:state.value.price,sequence:state.value.sequence};
    // Historical backfill must not block live health or new settlement receipts.
    if(!archiving){archiving=true;advance(state,config.exchange).catch(()=>{}).finally(()=>{archiving=false;});}
    if(!collecting){collecting=true;collect().catch(()=>{}).finally(()=>{collecting=false;});}
  }finally{setTimeout(()=>poll().catch(()=>{}),2000);}
}
poll().catch(()=>{});
http.createServer(async (req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const owner=url.searchParams.get('owner')??'';
  res.setHeader('cache-control','no-store');res.setHeader('content-type','application/json');
  if(req.method!=='GET'||url.pathname!=='/status'||owner.length<2||owner.length>64||!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(owner)){res.writeHead(400);res.end('{}');return;}
  if(owner===config.owner && Date.now()-activityAt>5000){
    activityAt=Date.now();
    try{await writeFile('/data/activity.txt',String(activityAt),{mode:0o600});}catch{}
  }
  const available=Boolean(observed&&Date.now()-observed.checkedAtMs<=10000);
  let operator={};
  try{operator=JSON.parse(await readFile('/data/operator.json','utf8'));}catch{}
  res.writeHead(available?200:503);
  res.end(JSON.stringify({available,network:'mainnet',exchange:config.exchange,owner,oracle:observed??null,keeperAccount:null,keeperHeartbeatMs:null,publisherHeartbeatMs:null,...operator,...forOwner(owner),settlements:[...recent.rows.filter(r=>r.owner===owner),...forOwner(owner).settlements].filter((r,i,a)=>a.findIndex(x=>x.id===r.id&&x.owner===r.owner)===i)}));
}).listen(8792,'0.0.0.0');
