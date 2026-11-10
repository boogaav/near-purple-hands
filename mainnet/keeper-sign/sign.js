import {setupWalletSelector,internalActionToNaj} from '@near-wallet-selector/core';
import {setupMeteorWallet} from '@near-wallet-selector/meteor-wallet';
import {Buffer} from 'buffer';
import config from '../config.json';
globalThis.Buffer??=Buffer;
const el=id=>document.getElementById(id);
const publicKey='ed25519:4yaFT6hnZ7kduFEvpBWPXzqWorKdn9vDQsjU8XJFERWA';
const methodNames=['submit_verified_price','fill_open','cancel_open','settle'];
el('details').textContent=['Permission: FunctionCall','Exchange: '+config.exchange,'Methods: '+methodNames.join(', '),'Public key: '+publicKey].join('\n');
let wallet;
el('connect').onclick=async()=>{
  el('review').disabled=true;
  try{
    const selector=await setupWalletSelector({network:'mainnet',modules:[setupMeteorWallet()]});
    wallet=await selector.wallet('meteor-wallet');
    await wallet.signIn({contractId:config.exchange,methodNames:['get_state']});
    if((await wallet.getAccounts())[0]?.accountId!==config.owner)throw Error('Select yellowhands.near in Meteor.');
    el('review').disabled=false;
    el('status').textContent='Enter a finite gas allowance and review the permission.';
  }catch(e){el('status').textContent=e.message;}
};
el('review').onclick=async()=>{
  el('review').disabled=true;
  try{
    const amount=el('amount').value.trim();
    if(!/^\d{1,9}(\.\d{1,24})?$/.test(amount))throw Error('Enter a positive NEAR amount.');
    const [whole,fraction='']=amount.split('.');
    const allowance=BigInt(whole+fraction.padEnd(24,'0'));
    if(!allowance)throw Error('Enter a positive gas allowance.');
    if((await wallet.getAccounts())[0]?.accountId!==config.owner)throw Error('Reconnect yellowhands.near.');
    const action=internalActionToNaj({type:'AddKey',params:{publicKey,accessKey:{permission:{receiverId:config.exchange,methodNames,allowance:String(allowance)}}}});
    const tx=await wallet.signAndSendTransaction({signerId:config.owner,receiverId:config.owner,actions:[action]});
    if(tx?.status?.Failure)throw Error('Transaction failed.');
    el('status').textContent='Check keeper status before retrying. '+(tx?.transaction?.hash??'');
  }catch(e){el('status').textContent=e.message;el('review').disabled=false;}
};
