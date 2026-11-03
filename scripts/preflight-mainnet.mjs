// Public read-only checks. No keys, signatures, contract calls or transactions.
import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('../mainnet/config.json',import.meta.url),'utf8'));
const endpoint=process.env.NEAR_MAINNET_RPC || 'https://rpc.mainnet.near.org';
async function rpc(method,params) {
 const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(`RPC HTTP ${response.status}`);
 const body=await response.json();if(body.error)throw Error(JSON.stringify(body.error));return body.result;
}
if(config.network!=='mainnet')throw Error('Wrong manifest network');
const status=await rpc('status',[]);
if(status.chain_id!=='mainnet')throw Error('Refusing non-mainnet RPC');
const owner=await rpc('query',{request_type:'view_account',account_id:config.owner,finality:'final'});
const token=await rpc('query',{request_type:'call_function',account_id:config.token,method_name:'ft_metadata',args_base64:'e30=',finality:'final'});
const metadata=JSON.parse(Buffer.from(token.result).toString());
if(metadata.symbol!=='USDC'||metadata.decimals!==config.tokenDecimals)throw Error('USDC metadata mismatch');
const blockers=[];
if(BigInt(owner.amount)===0n)blockers.push('Owner has zero NEAR; cannot fund deployment/storage/gas');
if(!config.oracle)blockers.push('Production oracle not selected or verified');
if(!config.exchange)blockers.push('Exchange not deployed');
blockers.push('Independent security review and always-on service verification outstanding');
console.log(JSON.stringify({network:status.chain_id,owner:config.owner,ownerBalanceYoctoNEAR:owner.amount,observedBlock:owner.block_height,token:config.token,tokenMetadata:{symbol:metadata.symbol,decimals:metadata.decimals},blockers,ready: false},null,2));
process.exitCode=2;
