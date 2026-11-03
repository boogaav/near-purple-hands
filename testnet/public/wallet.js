import {setupWalletSelector} from '@near-wallet-selector/core';
import {setupMeteorWallet} from '@near-wallet-selector/meteor-wallet';
import {setupModal} from '@near-wallet-selector/modal-ui-js';
import '@near-wallet-selector/modal-ui-js/styles.css';
import meteorIcon from '@near-wallet-selector/meteor-wallet/assets/meteor-icon.png';
export const selector = await setupWalletSelector({network:{networkId:'testnet',nodeUrl:'https://test.rpc.fastnear.com',helperUrl:'https://helper.testnet.near.org',explorerUrl:'https://testnet.nearblocks.io'},modules:[setupMeteorWallet({iconUrl:meteorIcon})]});
export const owner = () => selector.store.getState().accounts.find(a=>a.active)?.accountId;
let modal;
export async function login(contractId) {
 modal ||= setupModal(selector,{contractId,theme:'dark',description:'NEAR testnet · mock funds only. Choose Meteor for native NEAR signing.',methodNames:['request_open','request_close','add_liquidity','request_remove','cancel_remove','process_remove']});
 modal.show();
}
export async function send(receiverId,methodName,args={},deposit='0',gas='200000000000000') {
 const w=await selector.wallet();
 const result=await w.signAndSendTransaction({receiverId,actions:[{type:'FunctionCall',params:{methodName,args,gas,deposit}}]});
 if(result?.status?.Failure || result?.receipts_outcome?.some(r=>r.outcome.status?.Failure)) throw Error('Transaction failed. Check wallet receipt.');
 return result;
}
