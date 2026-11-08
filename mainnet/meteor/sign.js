import {internalActionToNaj, setupWalletSelector} from '@near-wallet-selector/core';
import {setupMeteorWallet} from '@near-wallet-selector/meteor-wallet';
import {Buffer} from 'buffer';
import pilot from '../config.json';
globalThis.Buffer ??= Buffer;
const el = id => document.getElementById(id);
let wallet;
async function state() {
  const response = await fetch('/rpc', {method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0', id:1, method:'query', params:{request_type:'call_function',
      account_id:pilot.exchange, method_name:'get_state', args_base64:'e30=', finality:'final'}})});
  const data = await response.json();
  if (!data.result) throw Error('Unable to read finalized mainnet state');
  return JSON.parse(Buffer.from(data.result.result).toString());
}
el('connect').onclick = async () => {
  el('connect').disabled = true;
  el('enable').hidden = true;
  try {
    const selector = await setupWalletSelector({network:'mainnet', modules:[setupMeteorWallet()]});
    wallet = await selector.wallet('meteor-wallet');
    const accounts = await wallet.signIn({contractId:pilot.exchange, methodNames:['get_state']});
    if (accounts[0]?.accountId !== pilot.owner) throw Error('Select yellowhands.near in Meteor');
    const s = await state();
    el('enable').hidden = !s.paused;
    el('status').textContent = s.paused ? 'Trading is paused.' : 'Trading entries are enabled.';
  } catch (e) { el('status').textContent = e.message; }
  finally { el('connect').disabled = false; }
};
el('enable').onclick = async () => {
  el('enable').disabled = true;
  try {
    if ((await state()).paused) {
      const action = internalActionToNaj({type:'FunctionCall',params:{methodName:'pause_entries',
        args:{paused:false},gas:'30000000000000',deposit:'0'}});
      const tx = await wallet.signAndSendTransaction({signerId:pilot.owner,receiverId:pilot.exchange,actions:[action]});
      if (tx?.status?.Failure || tx?.receipts_outcome?.some(r=>r.outcome.status?.Failure)) throw Error('Transaction failed in Meteor');
      if (tx?.transaction?.hash) el('receipt').textContent = tx.transaction.hash;
    }
    const s = await state();
    el('status').textContent = s.paused ? 'Awaiting confirmation. Reconnect to refresh.' : 'Trading entries are enabled.';
    el('enable').hidden = true;
  } catch (e) { el('status').textContent = e.message; }
  finally { el('enable').disabled = false; }
};
