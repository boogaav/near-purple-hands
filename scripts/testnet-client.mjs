import { connect, KeyPair, keyStores } from 'near-api-js';
import { readFile } from 'node:fs/promises';
import { TESTNET_RPC, paceRpc } from './testnet-rpc.mjs';
export const fixedPilot = process.env.NEAR_TESTNET_PROFILE === '500x';
const manifestName = fixedPilot ? 'testnet-500x.json' : 'testnet.json';
export const runtimeDir = new URL(fixedPilot ? '../.local/testnet-500x-runtime/' : '../.local/testnet-runtime/', import.meta.url);
export const manifest = JSON.parse(await readFile(new URL('../deployments/'+manifestName, import.meta.url)));
export const ids = manifest.accounts;
export async function client(roles = []) {
  const store = new keyStores.InMemoryKeyStore();
  for (const role of roles) {
    const id = role === 'root' ? manifest.root : ids[role];
    if (!id?.endsWith('.testnet')) throw Error('Testnet only');
    const key = JSON.parse(await readFile(new URL(`../.local/testnet-keys/${id}.json`, import.meta.url)));
    await store.setKey('testnet', id, KeyPair.fromString(key.private_key));
  }
  const near = await connect({ networkId: 'testnet', nodeUrl: TESTNET_RPC, keyStore: store });
  paceRpc(near.connection.provider);
  if ((await near.connection.provider.status()).chain_id !== 'testnet') throw Error('Wrong chain');
  const view = async (contractId, methodName, args = {}) => (await near.account(ids.exchange)).viewFunction({contractId, methodName, args});
  const call = async (role, contractId, methodName, args = {}, attachedDeposit = 0n) => {
    const a = await near.account(role === 'root' ? manifest.root : ids[role]);
    const sent = await a.functionCall({contractId, methodName, args, attachedDeposit, gas: 200_000_000_000_000n});
    const r = await near.connection.provider.txStatus(sent.transaction.hash, a.accountId, 'FINAL');
    if (r.status?.Failure || r.receipts_outcome?.some(x => x.outcome.status?.Failure)) throw Error(`${methodName} failed: ${sent.transaction.hash}`);
    return r;
  };
  return {near, view, call, state: () => view(ids.exchange, 'get_state')};
}
