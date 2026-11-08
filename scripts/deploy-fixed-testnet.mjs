// Fresh, faucet-funded testnet account. Never upgrade an existing deployment.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Account, transactions } from 'near-api-js';
import { client, ids, manifest } from './testnet-client.mjs';
const exchange = 'purple-hands-500x-v1.testnet';
const {near} = await client(['root']);
const parent = await near.account(manifest.root);
const signingKey = await near.connection.signer.keyStore.getKey('testnet', manifest.root);
const account = new Account(near.connection, exchange);
const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url)));
const oracle = await json('../mainnet/pyth-candidate.json');
const code = await readFile(new URL('../artifacts/near_purple_exchange_verified.wasm', import.meta.url));
try {
  await account.state();
} catch (error) {
  if (!/does not exist|UNKNOWN_ACCOUNT/i.test(error.message) && error.type !== 'AccountDoesNotExist') throw error;
  const response = await fetch('https://helper.nearprotocol.com/account', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({newAccountId:exchange,newAccountPublicKey:signingKey.getPublicKey().toString()}),
    signal:AbortSignal.timeout(45000),
  });
  if (!response.ok) throw Error('Testnet faucet HTTP '+response.status);
  await account.state();
}
await near.connection.signer.keyStore.setKey('testnet', exchange, signingKey);
const args = {token:ids.token, guardian:ids.guardian, signer:[...Buffer.from(oracle.signerHex,'hex')],
  signer_expires_at:oracle.signerExpiresAt, feed:oracle.candidateFeed, channel:oracle.candidateChannel, max_confidence_bps:15};
if ((await account.state()).code_hash === '11111111111111111111111111111111') {
  const tx = await account.signAndSendTransaction({receiverId:exchange,actions:[
    transactions.deployContract(code),transactions.functionCall('new_verified',Buffer.from(JSON.stringify(args)),100_000_000_000_000n,0n)]});
  const final = await near.connection.provider.txStatus(tx.transaction.hash,exchange,'FINAL');
  if(final.status?.Failure || final.receipts_outcome.some(r=>r.outcome.status?.Failure)) throw Error('Deployment failed: '+tx.transaction.hash);
  console.log('Deployment transaction', tx.transaction.hash);
}
const deployed = await near.connection.provider.query({request_type:'view_code',account_id:exchange,finality:'final'});
if (!code.equals(Buffer.from(deployed.code_base64,'base64'))) throw Error('Deployed code mismatch');
const config = await parent.viewFunction({contractId:exchange,methodName:'get_oracle_config',args:{}});
if(config.manual_price_fallback !== false || config.feed !== args.feed || config.channel !== args.channel || config.max_confidence_bps !== 15 || JSON.stringify(config.signer)!==JSON.stringify(args.signer)) throw Error('Unexpected verifier configuration');
await writeFile(new URL('../deployments/testnet-500x.json',import.meta.url),JSON.stringify({network:'testnet',root:manifest.root,accounts:{...ids,exchange},sha256:createHash('sha256').update(code).digest('hex'),oracle:config.mode},null,2)+'\n');
console.log('Verified',exchange);
