import {connect,KeyPair,keyStores} from 'near-api-js';
import {createPrivateKey} from 'node:crypto';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {keeperAction} from '../../testnet/policy.mjs';
import config from '../config.json' with {type:'json'};
const rpc='https://rpc.mainnet.fastnear.com';
const secret=createPrivateKey(await readFile('/run/operator/keeper.pem')).export({format:'jwk'});
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(bytes){let n=BigInt('0x'+bytes.toString('hex')),out='';while(n){out=alphabet[Number(n%58n)]+out;n/=58n;}return '1'.repeat(bytes.findIndex(x=>x!==0))+out;}
const pair=KeyPair.fromString('ed25519:'+base58(Buffer.concat([Buffer.from(secret.d,'base64url'),Buffer.from(secret.x,'base64url')])));
const store=new keyStores.InMemoryKeyStore();await store.setKey('mainnet',config.owner,pair);
const near=await connect({networkId:'mainnet',nodeUrl:rpc,keyStore:store});
const provider=near.connection.provider,account=await near.account(config.owner);
const required=['submit_verified_price','fill_open','settle','cancel_open'];
const health={keeperAccount:config.owner,keeperHeartbeatMs:null,publisherHeartbeatMs:null,publisherStatus:'starting'};
const auth=async block=>{
  const key=await provider.query({request_type:'view_access_key',account_id:config.owner,public_key:pair.getPublicKey().toString(),block_id:block});
  const permission=key.permission?.FunctionCall;
  return permission?.receiver_id===config.exchange&&BigInt(permission.allowance??0)>0n&&permission.method_names.length===required.length&&required.every(m=>permission.method_names.includes(m));
};
async function send(methodName,args){
  const tx=await account.functionCall({contractId:config.exchange,methodName,args,gas:50000000000000n,attachedDeposit:0n});
  if(tx.status?.Failure||tx.receipts_outcome.some(r=>r.outcome.status?.Failure))throw Error('Contract rejected transaction');
}
async function poll(){
  health.keeperHeartbeatMs=null;
  const block=await provider.block({finality:'final'}),blockId={blockId:block.header.hash};
  const view=methodName=>account.viewFunction({contractId:config.exchange,methodName,args:{},...blockId});
  const [oracle,state,authorized]=await Promise.all([view('get_oracle_config'),view('get_state'),auth(block.header.hash).catch(()=>false)]);
  const registered=authorized&&Object.hasOwn(state.accounts,config.owner);
  if(registered){
    for(const [owner,position] of Object.entries(state.positions)){
      const method=keeperAction(position,state,block.header.height,Math.floor(Date.now()/1000));
      if(method==='cancel_open'||(method&&Date.now()*1000-oracle.last_observed_us<=oracle.max_age_us))await send(method,{owner});
    }
    health.keeperHeartbeatMs=Date.now();
  }
  const key=(await readFile('/run/operator/pyth-api-key','utf8')).trim();
  const res=await fetch('https://pyth-lazer.dourolabs.app/v1/latest_price',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({priceFeedIds:[1],channel:'fixed_rate@200ms',formats:['solana'],properties:['price','publisherCount','exponent','confidence','marketSession','feedUpdateTimestamp']}),signal:AbortSignal.timeout(4000)});
  if(!res.ok)throw Error('Provider unavailable');
  const {parsed,solana}=await res.json(),q=parsed.priceFeeds[0];
  health.publisherHeartbeatMs=Date.now();health.confidenceBps=Number(BigInt(q.confidence)*1000000n/BigInt(q.price))/100;
  if(q.priceFeedId!==oracle.feed||BigInt(q.price)<=0n||BigInt(q.confidence)*10000n>BigInt(q.price)*BigInt(oracle.max_confidence_bps)){health.publisherStatus='confidence_rejected';return;}
  if(!registered){health.publisherStatus='operator_authorization_required';return;}
  const age=Date.now()*1000-Number(parsed.timestampUs);
  if(age<0||age>oracle.max_age_us||Number(parsed.timestampUs)<=oracle.last_observed_us){health.publisherStatus='observation_outside_window';return;}
  if(!['hex','base64'].includes(solana.encoding))throw Error('Unsupported envelope');
  await send('submit_verified_price',{message:Buffer.from(solana.data.replace(/^0x/,''),solana.encoding).toString('base64')});
  health.publisherStatus='submitted';
}
for(;;){
  try{await poll();}catch{health.publisherStatus='unavailable';}
  await writeFile('/data/operator.tmp',JSON.stringify(health));await rename('/data/operator.tmp','/data/operator.json');
  await new Promise(r=>setTimeout(r,2000));
}
