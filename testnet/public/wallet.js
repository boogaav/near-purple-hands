import {setupWalletSelector} from '@near-wallet-selector/core';
import {setupMyNearWallet} from '@near-wallet-selector/my-near-wallet';
export const selector = await setupWalletSelector({network:{networkId:'testnet',nodeUrl:'https://test.rpc.fastnear.com',helperUrl:'https://helper.testnet.near.org',explorerUrl:'https://testnet.nearblocks.io'},modules:[setupMyNearWallet({walletUrl:"https://testnet.mynearwallet.com"})]});
export const owner = () => selector.store.getState().accounts.find(a=>a.active)?.accountId;
export async function login(contractId) { const w=await selector.wallet('my-near-wallet'); await w.signIn({contractId,methodNames:['request_open','request_close','add_liquidity','request_remove','cancel_remove','process_remove']}); }
export async function send(receiverId,methodName,args={},deposit='0',gas='200000000000000') {
 const w=await selector.wallet();
 const result=await w.signAndSendTransaction({receiverId,actions:[{type:'FunctionCall',params:{methodName,args,gas,deposit}}]});
 if(result?.status?.Failure || result?.receipts_outcome?.some(r=>r.outcome.status?.Failure)) throw Error('Transaction failed. Check wallet receipt.');
 return result;
}
