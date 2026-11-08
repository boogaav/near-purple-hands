import http from 'node:http';
import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('../config.json',import.meta.url)));
const rpc='https://rpc.mainnet.near.org';
async function query(method,block){
  const response=await fetch(rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'query',params:{request_type:'call_function',account_id:config.exchange,method_name:method,args_base64:'e30=',...block}}),signal:AbortSignal.timeout(4000)});
  const {result}=await response.json();
  if(!result?.result)throw Error('NEAR view unavailable');
  return {height:result.block_height,hash:result.block_hash,value:JSON.parse(Buffer.from(result.result))};
}
let observed;
async function poll(){
  try{
    const state=await query('get_state',{finality:'final'});
    const oracle=await query('get_oracle_config',{block_id:state.hash});
    observed={finalizedBlockHeight:state.height,checkedAtMs:Date.now(),lastObservedUs:oracle.value.last_observed_us,maxAgeUs:oracle.value.max_age_us,priceE6:state.value.price,sequence:state.value.sequence};
  }finally{setTimeout(()=>poll().catch(()=>{}),2000);}
}
poll().catch(()=>{});
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const owner=url.searchParams.get('owner')??'';
  res.setHeader('cache-control','no-store');res.setHeader('content-type','application/json');
  if(req.method!=='GET'||url.pathname!=='/status'||owner.length<2||owner.length>64||!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(owner)){res.writeHead(400);res.end('{}');return;}
  const available=Boolean(observed&&Date.now()-observed.checkedAtMs<=10000);
  res.writeHead(available?200:503);
  res.end(JSON.stringify({available,network:'mainnet',exchange:config.exchange,owner,oracle:observed??null,keeperAccount:null,keeperHeartbeatMs:null,publisherHeartbeatMs:null,historyCoverage:{backfillComplete:false,indexedThroughBlock:null},settlements:[]}));
}).listen(8792,'0.0.0.0');
