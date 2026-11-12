import {ACTIONS,STAGES,CODES,errorCode,validClientEvent} from './policy.mjs';
export function createOperationsRecorder({storage,fetcher=(...args)=>globalThis.fetch(...args),host=globalThis.location?.hostname,now=Date.now}={}){
 if(!['yellowhands.wtf','purplehands.wtf'].includes(host))return {event(){},begin(){return null},flush(){}};
 if(!storage)try{storage=globalThis.sessionStorage;}catch{}
 const key='hands:operations:v1';let session=crypto.randomUUID(),queue=[],sending=false,dropped=0;
 try{const s=JSON.parse(storage.getItem(key)||'null');if(s&&/^[a-f0-9-]{36}$/.test(s.session)&&Array.isArray(s.queue)){session=s.session;queue=s.queue.filter(e=>validClientEvent(e,now())).slice(-500);}}catch{}
 const persist=()=>{try{storage.setItem(key,JSON.stringify({session,queue}));}catch{}};
 async function flush(){if(sending||!queue.length)return;sending=true;const batch=queue.slice(0,20);try{const r=await fetcher('/api/operations/client',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:batch}),keepalive:true,signal:AbortSignal.timeout(8000)});if(r.ok){const ids=new Set(batch.map(e=>e.id));queue=queue.filter(e=>!ids.has(e.id));persist();}else if(r.status===400){queue=queue.filter(e=>!batch.includes(e));dropped+=batch.length;persist();}}catch{}finally{sending=false;}}
 function event(action,stage,fields={}){
  if(!ACTIONS.includes(action)||!STAGES.includes(stage))return;
  const item={id:crypto.randomUUID(),session,attempt:fields.attempt||crypto.randomUUID(),at:now(),action,stage,code:CODES.includes(fields.code)?fields.code:'none'};
  if(fields.network)item.network=fields.network;if(fields.position!==undefined)item.position=String(fields.position);
  for(const k of ['wallet','intent','tx'])if(typeof fields[k]==='string')item[k]=k==='tx'&&fields.network==='near'?fields[k]:fields[k].toLowerCase();
  if(Number.isFinite(fields.duration))item.duration=Math.min(86400000,Math.max(0,Math.round(fields.duration)));
  if(Number.isFinite(fields.count))item.count=Math.max(0,Math.floor(fields.count));
  if(!validClientEvent(item,now()))return;
  if(queue.length>=500){queue.shift();dropped++;}queue.push(item);persist();void flush();return item.attempt;
 }
 const timer=setInterval(()=>{if(dropped){const n=dropped;dropped=0;event('unknown','dropped',{count:n});}void flush();},5000);
 globalThis.addEventListener?.('online',flush);globalThis.addEventListener?.('pagehide',flush);
 return {event,flush,begin(action,wallet){return event(action,'started',{wallet});},dispose(){clearInterval(timer);globalThis.removeEventListener?.('online',flush);globalThis.removeEventListener?.('pagehide',flush);}};
}
// Observe semantic actions, not provider request payloads. Public hashes only;
// signing data, keys, emails, inputs, messages and raw errors never enter telemetry.
export function instrumentSession(session,recorder){
 const emit=(...a)=>{try{return recorder.event(...a);}catch{}};
 const begin=(...a)=>{try{return recorder.begin(...a);}catch{return null;}};
 function wrap(target,method,nameFor){
  const original=target[method];if(typeof original!=='function')return;
  target[method]=async function(...args){
   const name=nameFor(args),attempt=begin(name,session.wallet),start=Date.now(),adapter=session.adapter;
   const attached=adapter&&!adapter.operationAttemptId&&attempt;
   if(attached){adapter.operationAttemptId=attempt;adapter.onTelemetry=e=>emit(name,e.stage,{attempt,wallet:session.wallet,intent:e.intent,tx:e.tx});}
   try{const result=await original.apply(this,args);emit(name,'resolved',{attempt,wallet:session.wallet,intent:/^0x[a-f0-9]{64}$/i.test(typeof result==='string'?result:'')&&['open','close'].includes(method)?result:undefined,duration:Date.now()-start});
    if(method==='connect'&&session.adapter&&!session.adapter.operationsInstrumented){
     session.adapter.operationsInstrumented=true;
     for(const [m,a]of Object.entries({depositLiquidity:'add_liquidity',requestRedemption:'request_removal',claimLiquidity:'claim_removal',cancelRedemption:'cancel_removal'}))wrap(session.adapter,m,()=>a);
    }return result;
   }catch(e){emit(name,'failed',{attempt,wallet:session.wallet,code:errorCode(e),intent:session.pending?.id,duration:Date.now()-start});throw e;}
   finally{if(attached&&adapter.operationAttemptId===attempt){adapter.operationAttemptId=undefined;adapter.onTelemetry=undefined;}}
  };
 }
 for(const [method,action]of Object.entries({connect:'connect',deposit:'deposit',withdraw:'withdraw',authorize:'authorize',open:'open_long',close:'close',invalidate:'invalidate',revoke:'revoke'}))wrap(session,method,args=>method==='open'?(args[0]?'open_long':'open_short'):action);
 const emitOriginal=session.emit;let lastState='';
 if(typeof emitOriginal==='function')session.emit=function(...a){
  const state=[this.wallet,this.position?.id,this.position?.filled,this.pending?.id].join(':');
  if(state!==lastState){lastState=state;emit('account','state',{wallet:this.wallet,intent:this.position?.openIntentHash||this.pending?.id,code:this.position?.filled?'filled':'none'});}
  return emitOriginal.apply(this,a);
 };
 return session;
}
