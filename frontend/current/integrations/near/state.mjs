import cfg from './config.json' with {type:'json'};
export {cfg};
export const scope=owner=>['near',cfg.network,cfg.exchange,owner].join(':');
const readEndpoints=['https://free.rpc.fastnear.com','https://near.drpc.org'];
let preferred=0;
async function query(params,signal){
  const start=preferred;
  for(let offset=0;offset<readEndpoints.length;offset++){
    const index=(start+offset)%readEndpoints.length;
    const timeout=AbortSignal.timeout(4000);
    try{
      const res=await fetch(readEndpoints[index],{method:'POST',signal:signal?AbortSignal.any([signal,timeout]):timeout,headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'query',params})});
      if(res.ok){
        const json=await res.json();
        if(json.result){preferred=index;return json.result;}
      }
    }catch(error){if(signal?.aborted)throw error;}
  }
  throw Error('Finalized NEAR state unavailable. Retry.');
}
async function view(contract,method,args,block,signal){
  const result=await query({...block,request_type:'call_function',account_id:contract,method_name:method,args_base64:btoa(JSON.stringify(args))},signal);
  const decoded=new TextDecoder().decode(Uint8Array.from(result.result));
  const value=JSON.parse(decoded,(_key,n)=>{if(typeof n==='number'&&!Number.isSafeInteger(n))throw Error('Contract value exceeds safe precision.');return n;});
  return {value,block:result.block_hash,height:result.block_height};
}
export async function depositLimit(s,signal){
  const block={block_id:s.height};
  let policy;
  try{policy=(await view(cfg.exchange,'get_deposit_policy',{},block,signal)).value;}
  catch(error){if(signal.aborted)throw error;}
  if(policy?.cumulative_cap===null)return s.wallet;
  // Old pilot deployments store the cumulative amount as a little-endian u64.
  const key=btoa('pilot:cumulative_deposits');
  const state=await query({...block,request_type:'view_state',account_id:cfg.exchange,prefix_base64:key},signal);
  const item=state.values.find(row=>row.key===key);
  const bytes=item?Uint8Array.from(atob(item.value),c=>c.charCodeAt(0)):new Uint8Array(8);
  if(bytes.length!==8)throw Error('Unable to verify the deposit limit.');
  const left=parseAmount(cfg.pilotBudgetUSDC)-new DataView(bytes.buffer).getBigUint64(0,true);
  return left<=0n?0n:left<s.wallet?left:s.wallet;
}
export async function walletBalance(owner,signal){
  const read=await view(cfg.token,'ft_balance_of',{account_id:owner},{finality:'final'},signal);
  return BigInt(read.value);
}
export async function snapshot(owner,signal){
  const state=await view(cfg.exchange,'get_state',{}, {finality:'final'},signal);
  const at={block_id:state.block};
  const [oracle,usdc,withdrawal,storage,bounds]=await Promise.all([
    view(cfg.exchange,'get_oracle_config',{},at,signal),view(cfg.token,'ft_balance_of',{account_id:owner},at,signal),
    view(cfg.exchange,'get_pending_withdrawal',{owner},at,signal),view(cfg.token,'storage_balance_of',{account_id:cfg.exchange},at,signal),
    view(cfg.token,'storage_balance_bounds',{},at,signal)]);
  const engine=state.value,a=Object.hasOwn(engine.accounts,owner)?engine.accounts[owner]:null;
  return {owner,scope:scope(owner),height:state.height,engine,account:a,position:Object.hasOwn(engine.positions,owner)?engine.positions[owner]:null,
    oracle:oracle.value,wallet:BigInt(usdc.value),pendingWithdrawal:BigInt(withdrawal.value),exchangeRegistered:!!storage.value,storageMin:bounds.value.min,
    shareValue:engine.shares?BigInt(a?.shares??0)*BigInt(engine.capital)/BigInt(engine.shares):0n};
}
export function fresh(s,now=Date.now()){
  const age=now*1000-s.oracle.last_observed_us;
  return ['pyth-pro-verified-candidate','hyperliquid-wormhole-queued'].includes(s.oracle.mode)&&s.engine.price>0&&age>=0&&age<=s.oracle.max_age_us;
}
export function entryBlock(s){
  if(s.owner!==cfg.owner)return 'Owner pilot · deposits and trades unavailable for this account';
  if(s.position)return s.position.entry?'Position open':'Confirming entry price…';
  if(s.engine.paused)return 'Entries paused';
  if(!s.account||s.account.balance<10240000)return 'Load 10.24 USDC to trade';
  const missing=110000000-(s.engine.capital-s.engine.reserved);
  if(missing>0)return 'Vault needs $'+(Math.ceil(missing/10000)/100).toFixed(2)+' more liquidity before trading';
  if(s.service?.reason)return s.service.reason;
  if(!fresh(s))return s.engine.price?'Waiting for a fresh verified price · trading temporarily unavailable':'Waiting for verified BTC price';
  return s.service?.healthy?'':'Checking trading service…';
}
export function parseAmount(input){
  if(!/^\d+(\.\d{1,6})?$/.test(input))throw Error('Enter a positive USDC amount with up to six decimals.');
  const [whole,fraction='']=input.split('.');const n=BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));
  if(n<=0n)throw Error('Enter a positive amount.');return n;
}
export function verifiedService(s,data,now=Date.now()){
  if(data?.network!=='mainnet'||data.exchange!==cfg.exchange||data.owner!==s.owner)return null;
  const heartbeat=data.keeperHeartbeatMs;
  const healthy=Number.isSafeInteger(heartbeat)&&heartbeat<=now&&now-heartbeat<=10000&&Object.hasOwn(s.engine.accounts,data.keeperAccount);
  const coverage = data.historyCoverage;
  const validHeight = Number.isSafeInteger(coverage?.indexedThroughBlock) && coverage.indexedThroughBlock > 0;
  const historyComplete = coverage?.backfillComplete === true && validHeight && coverage.indexedThroughBlock >= s.height;
  const status=data.publisherStatus;
  const reason=status==='gas_reserve_low'||status==='gas_reserve_empty_unavailable'||status==='near_gas_allowance_low'?'Price service needs gas · new trades paused':status==='idle'?'Starting price service…':typeof status==='string'&&status.endsWith('_unavailable')?'Price service reconnecting · new trades paused':null;
  return {healthy,reason,historyComplete,indexedThroughBlock:validHeight?coverage.indexedThroughBlock:null,settlements:Array.isArray(data.settlements)?data.settlements.filter(row=>row.owner===s.owner&&row.finalized===true&&/^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(row.hash)):[]};
}
export function grossResult(p,price){
  const change=(BigInt(price)-BigInt(p.entry))*(p.long?1n:-1n);
  const margin=BigInt(p.margin),entry=BigInt(p.entry);
  const numerator=change*margin*BigInt(p.leverage);
  const amount=numerator<0n?(numerator-entry+1n)/entry:numerator/entry;
  return amount>margin?margin:amount< -margin?-margin:amount;
}
