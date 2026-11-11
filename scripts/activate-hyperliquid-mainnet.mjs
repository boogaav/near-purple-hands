import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {connect,KeyPair,keyStores,transactions} from 'near-api-js';
import {createPublicClient,http,parseAbi} from 'viem';
import config from '../mainnet/config.json' with {type:'json'};

const source=createPublicClient({transport:http('https://rpc.hyperliquid.xyz/evm')});
assert.equal(await source.getChainId(),999);
const next=await source.readContract({
    address:'0x7C0faFc4384551f063e05aee704ab943b8B53aB3',
    abi:parseAbi(['function nextSequence(address) view returns (uint64)']),
    functionName:'nextSequence',args:['0x1e655b93fbf7f64251b7fae71a325b8260bc1b47']
});
const pair=KeyPair.fromString((await readFile('.local/pilot-mainnet.key','utf8')).trim());
assert.equal(Buffer.from(pair.getPublicKey().data).toString('hex'),config.exchange);
const keys=new keyStores.InMemoryKeyStore();
await keys.setKey('mainnet',config.exchange,pair);
const near=await connect({networkId:'mainnet',nodeUrl:'https://free.rpc.fastnear.com',keyStore:keys});
const account=await near.account(config.exchange);
const view=methodName=>account.viewFunction({contractId:config.exchange,methodName,args:{}});
const before=await view('get_state');
assert.equal(Object.keys(before.positions).length,0,'Existing positions must finish before activation');
assert.equal((await view('get_oracle_config')).mode,'pyth-pro-verified-candidate');
const code=await readFile('artifacts/near_purple_exchange_verified.wasm');
const deployed=await near.connection.provider.query({request_type:'view_code',account_id:config.exchange,finality:'final'});
await writeFile('.local/hyperevm-probe/previous-near.wasm',Buffer.from(deployed.code_base64,'base64'),{mode:0o600});
await writeFile('.local/hyperevm-probe/before-activation.json',JSON.stringify(before),{mode:0o600});
if(process.env.ACTIVATE_HYPERLIQUID!=='yes') {
    console.log('Preflight passed. Set ACTIVATE_HYPERLIQUID=yes only when the relay is ready.');
    process.exit(0);
}
const result=await account.signAndSendTransaction({receiverId:config.exchange,actions:[
    transactions.deployContract(code),
    transactions.functionCall('activate_hyperliquid',Buffer.from(JSON.stringify({next_sequence:String(next)})),30000000000000n,0n)
]});
assert(!result.status.Failure && result.receipts_outcome.every(r=>!r.outcome.status.Failure));
const after=await view('get_state');
for(const field of ['accounts','total','capital','reserved','treasury','shares','withdrawals']) assert.deepEqual(after[field],before[field]);
assert.equal((await view('get_oracle_config')).mode,'hyperliquid-wormhole-queued');
await writeFile('deployments/near-hyperliquid-activation.json',JSON.stringify({
    exchange:config.exchange,transaction:result.transaction.hash,
    wasmSha256:createHash('sha256').update(code).digest('hex'),nextSequence:String(next)
},null,2)+'\n');
console.log('Activated',result.transaction.hash);
