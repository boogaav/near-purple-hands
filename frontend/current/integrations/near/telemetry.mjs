import {createOperationsRecorder} from '../../analytics/operations/browser.mjs';
import {errorCode} from '../../analytics/operations/policy.mjs';
export const nearAction=(method,long)=>({request_open:long?'open_long':'open_short',request_close:'close',ft_transfer_call:'deposit',withdraw:'withdraw',add_liquidity:'add_liquidity',request_remove:'request_removal',process_remove:'claim_removal',cancel_remove:'cancel_removal',cancel_open:'invalidate',register:'account',storage_deposit:'account',enable:'authorize',revoke:'revoke',login:'login'})[method]||'account';
export function createNearTelemetry({recorder,storage,fetcher=(...a)=>fetch(...a),now=Date.now}={}){
 try{recorder??=createOperationsRecorder();storage??=sessionStorage;}catch{}
 const key='yellowhands:near:operations:v1';let pending=[],seen=[],checking=false;
 try{({pending=[],seen=[]}=JSON.parse(storage.getItem(key)||'{}'));}catch{}
 if(!Array.isArray(pending))pending=[];if(!Array.isArray(seen))seen=[];
 const save=()=>{try{storage?.setItem(key,JSON.stringify({pending:pending.slice(-100),seen:seen.slice(-500)}));}catch{}};
 const emit=(a,stage,fields={})=>{try{return recorder?.event(a.action,stage,{network:'near',wallet:a.wallet,attempt:a.attempt,...fields});}catch{}};
 const once=(id,a,stage,fields)=>{if(seen.includes(id))return;emit(a,stage,fields);seen.push(id);save();};
 return {
  begin(method,wallet,long){const a={action:nearAction(method,long),wallet,attempt:crypto.randomUUID(),started:now()};emit(a,'started');return a;},
  stage:emit,
  failed(a,e){emit(a,'failed',{code:errorCode(e),duration:now()-a.started});},
  connected(wallet){once('connected:'+wallet,{action:'account',wallet},'connected');},
  outcome(a,outcome){const tx=outcome?.transaction?.hash;if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tx||''))return;emit(a,'submitted',{tx});pending.push({...a,tx});save();},
  async reconcile(state){
   if(checking)return;checking=true;
   try{
    const wallet=state.owner;
    if(state.position?.entry){const p=state.position;once('filled:'+wallet+':'+p.id,{action:p.long?'open_long':'open_short',wallet},'outcome',{position:String(p.id),code:'filled'});}
    for(const r of state.service?.settlements||[]){if(r.owner!==wallet||r.finalized!==true||!/^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(r.hash||''))continue;once('settled:'+wallet+':'+r.id,{action:'close',wallet},'outcome',{position:String(r.id),tx:r.hash,code:'settled'});}
    for(const a of pending.filter(a=>a.wallet===wallet&&now()-a.started<86400000).slice(0,2)){
     try{const response=await fetcher('https://free.rpc.fastnear.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tx',params:{tx_hash:a.tx,sender_account_id:wallet,wait_until:'FINAL'}}),signal:AbortSignal.timeout(5000)});if(!response.ok)continue;const {result:r}=await response.json();if(r?.final_execution_status!=='FINAL'||r.transaction?.hash!==a.tx||r.transaction?.signer_id!==wallet)continue;
      const failed=r.status?.Failure||r.receipts_outcome?.some(x=>x.outcome?.status?.Failure);
      if(!failed&&!Object.hasOwn(r.status||{},'SuccessValue'))continue;
      // A successful entry/close request is accepted, not a filled/settled trade.
      let stage=failed?'failed':['open_long','open_short','close'].includes(a.action)?'accepted':'resolved';
      // NEP-141 resolver returns the amount accepted; zero means a refunded deposit.
      if(!failed&&a.action==='deposit'){try{if(BigInt(JSON.parse(atob(r.status.SuccessValue)))===0n)stage='failed';}catch{stage='accepted';}}
      emit(a,stage,{tx:a.tx,code:failed?'error':stage==='failed'?'canceled':'none',duration:now()-a.started});pending=pending.filter(x=>x.tx!==a.tx);save();
     }catch{} // RPC delay is unknown, never a transaction failure.
    }
   }finally{checking=false;}
  }
 };
}
let shared;
export const nearTelemetry=()=>shared??=createNearTelemetry();
