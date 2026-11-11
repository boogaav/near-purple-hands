// The contract consumes every source sequence and executes queued positions automatically.
import {readFile, writeFile, rename} from 'node:fs/promises';
import {createPublicClient, createWalletClient, defineChain, http, parseAbi} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {connect, KeyPair, keyStores} from 'near-api-js';
import {queryNear} from './rpc.mjs';
import config from '../config.json' with {type:'json'};

const emitter = '0x1e655b93fbf7f64251b7fae71a325b8260bc1b47';
const core = '0x7C0faFc4384551f063e05aee704ab943b8B53aB3';
const abi = parseAbi([
    'function capture() payable returns (uint64)',
    'function publisher() view returns (address)',
    'function messageFee() view returns (uint256)',
    'function nextSequence(address) view returns (uint64)',
]);
const chain = defineChain({id:999,name:'HyperEVM',nativeCurrency:{name:'HYPE',symbol:'HYPE',decimals:18},rpcUrls:{default:{http:['https://rpc.hyperliquid.xyz/evm']}}});
const source = createPublicClient({chain,transport:http(undefined,{timeout:5000})});
const secret = JSON.parse(await readFile(process.env.HYPERLIQUID_SIGNER_FILE ?? '.local/hyperevm-probe/signer.json','utf8'));
const account = privateKeyToAccount(secret[0].private_key);
const wallet = createWalletClient({chain,account,transport:http(undefined,{timeout:5000})});
if (await source.getChainId() !== 999) throw Error('Unexpected source network');
if ((await source.readContract({address:emitter,abi,functionName:'publisher'})).toLowerCase() !== account.address.toLowerCase()) throw Error('Wrong emitter publisher');
if (!process.env.NEAR_RELAY_KEY_FILE) throw Error('A restricted NEAR relay key is required');
const store = new keyStores.InMemoryKeyStore();
const key = KeyPair.fromString((await readFile(process.env.NEAR_RELAY_KEY_FILE,'utf8')).trim());
await store.setKey('mainnet',config.exchange,key);
const near = await connect({networkId:'mainnet',nodeUrl:process.env.NEAR_RPC_URL ?? 'https://free.rpc.fastnear.com',keyStore:store});
const signer = await near.account(config.exchange);
const permission = (await near.connection.provider.query({request_type:'view_access_key',account_id:config.exchange,public_key:key.getPublicKey().toString(),finality:'final'})).permission?.FunctionCall;
const methods = ['submit_hyperliquid_price','cancel_open'];
if (!permission || permission.receiver_id !== config.exchange || permission.method_names.length !== methods.length || !methods.every(m=>permission.method_names.includes(m))) throw Error('Unexpected relay key permissions');
const view = async methodName => {
    const {result}=await queryNear({request_type:'call_function',account_id:config.exchange,method_name:methodName,args_base64:'e30=',finality:'final'});
    return JSON.parse(Buffer.from(result.result));
};
const guardians = ['https://wormhole-v2-mainnet-api.chainlayer.network', 'https://wormhole-v2-mainnet-api.mcf.rocks'];
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
const continuous = process.env.RELAY_CONTINUOUS === 'true';
const limit = Number(process.env.RELAY_MAX_QUOTES ?? 20);
if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw Error('Validation quote budget must be 1–100');
let stopped = false;
process.on('SIGTERM',()=>{stopped=true;});
process.on('SIGINT',()=>{stopped=true;});
let stage = 'starting';
let report = {keeperAccount:config.owner,keeperHeartbeatMs:null,publisherHeartbeatMs:null,publisherStatus:'starting'};
async function record(update) {
    report = {...report,...update,checkedAtMs:Date.now()};
    console.log(JSON.stringify(report));
    if(process.env.RELAY_STATUS_FILE) {
        await writeFile(process.env.RELAY_STATUS_FILE+'.tmp',JSON.stringify(report),{mode:0o600});
        await rename(process.env.RELAY_STATUS_FILE+'.tmp',process.env.RELAY_STATUS_FILE);
    }
}
async function step() {
    stage = 'near_read';
    const oracle = await view('get_oracle_config');
    if (oracle.mode !== 'hyperliquid-wormhole-queued') throw Error('Queued oracle is not active');
    const expected = BigInt(oracle.next_sequence);
    if (continuous && process.env.RELAY_ACTIVITY_FILE) {
        const state = await view('get_state');
        let seen = 0;
        try { seen = Number(await readFile(process.env.RELAY_ACTIVITY_FILE,'utf8')); } catch {}
        if (!Object.keys(state.positions).length && Date.now()-seen > 30000) {
            await record({keeperHeartbeatMs:null,entryReady:false,publisherStatus:'idle'});
            await sleep(2000);
            return;
        }
    }
    stage = 'source_read';
    const next = await source.readContract({address:core,abi,functionName:'nextSequence',args:[emitter]});
    if(expected > next) throw Error('NEAR sequence exceeds emitter sequence');
    const gasPrice = await source.getGasPrice();
    const balance = await source.getBalance({address:account.address});
    // Stop inviting new entries while retaining gas for an existing position's observations.
    const entryReady = balance >= gasPrice * 250000n * 20n;
    if(expected === next) {
        const fee = await source.readContract({address:core,abi,functionName:'messageFee'});
        if(gasPrice > 500000000n || fee > 1000000000000n) throw Error('Source fee exceeds limit');
        if(balance < gasPrice*250000n+fee) { stage='gas_reserve_empty'; throw Error('HYPE reserve depleted'); }
        const [pending,confirmed] = await Promise.all([
            source.getTransactionCount({address:account.address,blockTag:'pending'}),
            source.getTransactionCount({address:account.address,blockTag:'latest'}),
        ]);
        if(pending !== confirmed) { stage='source_transaction_pending'; throw Error('Await source confirmation'); }
        stage = 'source_capture';
        const hash = await wallet.writeContract({address:emitter,abi,functionName:'capture',gas:250000n,gasPrice,value:fee});
        const receipt = await source.waitForTransactionReceipt({hash,pollingInterval:200,timeout:20000});
        if(receipt.status !== 'success') throw Error('Capture failed');
    }
    stage = 'guardian_delivery';
    let bytes;
    const deadline = Date.now()+12000;
    while(Date.now()<deadline && !bytes) {
        const responses = await Promise.all(guardians.map(async endpoint=>{
            try {
                const response = await fetch(endpoint+'/v1/signed_vaa/47/'+emitter.slice(2).padStart(64,'0')+'/'+expected,{signal:AbortSignal.timeout(1200)});
                return response.ok ? (await response.json()).vaaBytes : null;
            } catch { return null; }
        }));
        bytes = responses.find(Boolean);
        if(!bytes) await sleep(200);
    }
    if(!bytes) throw Error('Guardian delivery unavailable');
    stage = 'near_submit';
    const tx = await signer.functionCall({contractId:config.exchange,methodName:'submit_hyperliquid_price',args:{message:bytes},gas:180000000000000n,attachedDeposit:0n});
    if(tx.status?.Failure || tx.receipts_outcome.some(r=>r.outcome.status?.Failure)) throw Error('NEAR verification or settlement failed');
    let accepted;
    const finalityDeadline=Date.now()+6000;
    do {
        accepted=await view('get_oracle_config');
        if(BigInt(accepted.next_sequence)===expected+1n) break;
        await sleep(300);
    } while(Date.now()<finalityDeadline);
    if(BigInt(accepted.next_sequence)!==expected+1n) throw Error('Quote was not accepted');
    await record({keeperHeartbeatMs:entryReady?Date.now():null,publisherHeartbeatMs:Date.now(),publisherStatus:entryReady?'submitted':'gas_reserve_low',entryReady,sequence:String(expected),transaction:tx.transaction.hash,observedAgeMs:Date.now()-Number(accepted.last_observed_us)/1000,sourceBalanceWei:String(balance)});
}
async function cancelExpiredEntries() {
    const state = await view('get_state');
    const block = await near.connection.provider.block({finality:'final'});
    for(const [owner,position] of Object.entries(state.positions)) {
        if(!position.entry && block.header.height > position.open.until) {
            await signer.functionCall({contractId:config.exchange,methodName:'cancel_open',args:{owner},gas:30000000000000n,attachedDeposit:0n});
        }
    }
}
let completed=0;
while(!stopped && (continuous || completed<limit)) {
    try { await step(); completed++; }
    catch {
        await record({keeperHeartbeatMs:null,entryReady:false,publisherStatus:stage+'_unavailable'});
        try { await cancelExpiredEntries(); } catch { /* Preserve unavailable status until recovery. */ }
        if(!continuous) { process.exitCode=1; break; }
        await sleep(3000);
    }
}
await record({keeperHeartbeatMs:null,entryReady:false,publisherStatus:'stopped'});
