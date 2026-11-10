// Read-only preflight. Supply the Foundry artifact and the public operator address.
import {readFileSync} from 'node:fs';
const [artifact, from] = process.argv.slice(2);
if (!/^0x[0-9a-f]{40}$/i.test(from ?? '')) throw Error('Expected artifact path and public address');
const core='0x7C0faFc4384551f063e05aee704ab943b8B53aB3';
async function rpc(method,params) {
  const response=await fetch('https://rpc.hyperliquid.xyz/evm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(12000)});
  const result=await response.json();
  if (!response.ok || !result.result || result.error) throw Error(JSON.stringify(result.error ?? response.status));
  return BigInt(result.result);
}
if (await rpc('eth_chainId',[])!==999n) throw Error('Unexpected chain');
const data=JSON.parse(readFileSync(artifact)).bytecode.object+core.slice(2).padStart(64,'0');
const price=await rpc('eth_gasPrice',[]);
const balance=await rpc('eth_getBalance',[from,'latest']);
const fee=await rpc('eth_call',[{to:core,data:'0x1a90a219'},'latest']);
const gas=await rpc('eth_estimateGas',[{from,data}]);
console.log({operator:from,gas:String(gas),gasPriceWei:String(price),deploymentWei:String(gas*price),balanceWei:String(balance),feePerMessageWei:String(fee)});
