// One publication at a time. Restart recovers the exact next source sequence.
import {readFile, writeFile} from 'node:fs/promises';
import {createPublicClient, createWalletClient, defineChain, http, parseAbi} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {connect, KeyPair, keyStores} from 'near-api-js';
import config from '../config.json' with {type:'json'};

const emitter = '0x1e655b93fbf7f64251b7fae71a325b8260bc1b47';
const core = '0x7C0faFc4384551f063e05aee704ab943b8B53aB3';
const abi = parseAbi(['function capture() payable returns (uint64)', 'function publisher() view returns (address)', 'function messageFee() view returns (uint256)', 'function nextSequence(address) view returns (uint64)']);
const chain = defineChain({id:999,name:'HyperEVM',nativeCurrency:{name:'HYPE',symbol:'HYPE',decimals:18},rpcUrls:{default:{http:['https://rpc.hyperliquid.xyz/evm']}}});
const source = createPublicClient({chain,transport:http()});
const secret = JSON.parse(await readFile(process.env.HYPERLIQUID_SIGNER_FILE ?? '.local/hyperevm-probe/signer.json','utf8'));
const account = privateKeyToAccount(secret[0].private_key);
const wallet = createWalletClient({chain,account,transport:http()});
if ((await source.readContract({address:emitter,abi,functionName:'publisher'})).toLowerCase() !== account.address.toLowerCase()) throw Error('Wrong emitter publisher');
const store = new keyStores.InMemoryKeyStore();
await store.setKey('mainnet',config.exchange,KeyPair.fromString((await readFile(process.env.NEAR_RELAY_KEY_FILE ?? '.local/pilot-mainnet.key','utf8')).trim()));
const near = await connect({networkId:'mainnet',nodeUrl:process.env.NEAR_RPC_URL ?? 'https://free.rpc.fastnear.com',keyStore:store});
const signer = await near.account(config.exchange);
const view = methodName => signer.viewFunction({contractId:config.exchange,methodName,args:{}});
const guardians = ['https://wormhole-v2-mainnet-api.chainlayer.network', 'https://wormhole-v2-mainnet-api.mcf.rocks'];
let stopped = false;
process.on('SIGTERM',()=>{stopped=true;});
process.on('SIGINT',()=>{stopped=true;});
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
const limit = Number(process.env.RELAY_MAX_QUOTES ?? 20);
if (!Number.isSafeInteger(limit) || limit<1 || limit>100) throw Error('Quote budget must be 1–100');
for(let count=0; count<limit && !stopped; count++) {
    const oracle = await view('get_oracle_config');
    if (oracle.mode !== 'hyperliquid-wormhole-queued') throw Error('Queued oracle is not active');
    const expected = BigInt(oracle.next_sequence);
    const next = await source.readContract({address:core,abi,functionName:'nextSequence',args:[emitter]});
    if(expected > next) throw Error('NEAR sequence exceeds emitter sequence');
    if(expected === next) {
        const price = await source.getGasPrice();
        const fee = await source.readContract({address:core,abi,functionName:'messageFee'});
        if(price > 500000000n || fee > 1000000000000n) throw Error('Gas or message fee exceeds probe budget');
        if(await source.getBalance({address:account.address}) < price*250000n+fee) throw Error('HYPE reserve depleted');
        const hash = await wallet.writeContract({address:emitter,abi,functionName:'capture',gas:250000n,gasPrice:price,value:fee});
        const receipt = await source.waitForTransactionReceipt({hash,pollingInterval:200});
        if(receipt.status !== 'success') throw Error('Capture failed');
    }
    let bytes;
    for(let attempt=0; attempt<40 && !bytes; attempt++) {
        for(const endpoint of guardians) {
            try {
                const response = await fetch(endpoint+'/v1/signed_vaa/47/'+emitter.slice(2).padStart(64,'0')+'/'+expected,{signal:AbortSignal.timeout(1200)});
                if(response.ok) bytes = (await response.json()).vaaBytes;
                if(bytes) break;
            } catch {}
        }
        if(!bytes) await sleep(200);
    }
    if(!bytes) throw Error('Guardian delivery unavailable; retry the same sequence');
    const tx = await signer.functionCall({contractId:config.exchange,methodName:'submit_hyperliquid_price',args:{message:bytes},gas:180000000000000n,attachedDeposit:0n});
    if(tx.status?.Failure || tx.receipts_outcome.some(r=>r.outcome.status?.Failure)) throw Error('NEAR verification or settlement failed');
    const accepted = await view('get_oracle_config');
    if(BigInt(accepted.next_sequence)!==expected+1n) throw Error('Quote was not accepted');
    const report = {keeperAccount:config.owner,keeperHeartbeatMs:Date.now(),publisherHeartbeatMs:Date.now(),publisherStatus:'submitted',sequence:String(expected),transaction:tx.transaction.hash,observedAgeMs:Date.now()-Number(accepted.last_observed_us)/1000,checkedAtMs:Date.now()};
    console.log(JSON.stringify(report));
    if(process.env.RELAY_STATUS_FILE) await writeFile(process.env.RELAY_STATUS_FILE,JSON.stringify(report));
}
