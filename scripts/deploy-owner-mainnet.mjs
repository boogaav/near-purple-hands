// Deploy once to the dedicated implicit account. A second run verifies the existing code.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { connect, KeyPair, keyStores, transactions } from 'near-api-js';

const read = path => readFile(new URL('../' + path, import.meta.url));
const config = JSON.parse(await read('mainnet/config.json'));
const oracle = JSON.parse(await read('mainnet/pyth-candidate.json'));
const key = KeyPair.fromString((await read('.local/pilot-mainnet.key')).toString().trim());
const id = Buffer.from(key.getPublicKey().data).toString('hex');
assert.equal(id, config.plannedExchange);
assert.equal(config.network, 'mainnet');
const code = await read('artifacts/near_purple_exchange_verified.wasm');
const hash = createHash('sha256').update(code).digest('hex');
assert.equal(hash, config.pilotWasmSha256);
const store = new keyStores.InMemoryKeyStore();
await store.setKey('mainnet', id, key);
const near = await connect({ networkId:'mainnet', nodeUrl:'https://rpc.mainnet.near.org', keyStore:store });
const provider = near.connection.provider;
assert.equal((await provider.status()).chain_id, 'mainnet');
const account = await near.account(id);
const state = await account.state();
const args = { token:config.token, guardian:config.owner, signer:[...Buffer.from(oracle.signerHex,'hex')],
  signer_expires_at:oracle.signerExpiresAt, feed:oracle.candidateFeed, channel:oracle.candidateChannel, max_confidence_bps:5 };
let txHash;
if (state.code_hash === '11111111111111111111111111111111') {
  assert(BigInt(state.amount) >= 3500000000000000000000000n, 'Awaiting 3.5 native NEAR');
  const sent = await account.signAndSendTransaction({receiverId:id,actions:[
    transactions.deployContract(code),
    transactions.functionCall('new_verified',Buffer.from(JSON.stringify(args)),100000000000000n,0n)
  ]});
  txHash = sent.transaction.hash;
  console.log('Deployment transaction',txHash);
  const final = await provider.txStatus(txHash,id,'FINAL');
  assert(!final.status?.Failure && final.receipts_outcome.every(r=>!r.outcome.status.Failure));
}
const deployed = await provider.query({request_type:'view_code',account_id:id,finality:'final'});
assert(code.equals(Buffer.from(deployed.code_base64,'base64')), 'Unexpected deployed bytecode');
const view = methodName => account.viewFunction({contractId:id,methodName,args:{}});
const verified = await view('get_oracle_config');
assert.deepEqual(verified.signer,args.signer);
assert.equal(verified.feed,args.feed);
assert.equal(verified.channel,args.channel);
assert.equal(verified.max_confidence_bps,5);
assert.equal(verified.manual_price_fallback,false);
assert.equal((await view('get_state')).paused,true);
config.exchange=id;
config.oracle=verified.mode;
config.status='deployed-paused';
if(txHash) config.deploymentTransaction=txHash;
await writeFile(new URL('../mainnet/config.json',import.meta.url),JSON.stringify(config,null,2)+'\n');
console.log('Verified paused mainnet pilot',id);
