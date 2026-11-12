import {Buffer} from 'buffer';
import {setupWalletSelector,internalActionToNaj} from '@near-wallet-selector/core';
import {setupMeteorWallet} from '@near-wallet-selector/meteor-wallet';
import cfg from './config.json';
import {tradingMethods,isTradingPermission,isTradingCall} from './trading-permission.mjs';
globalThis.Buffer??=Buffer;
let initializing;
export async function meteorAccount(connect=false){
  initializing??=setupWalletSelector({network:'mainnet',modules:[setupMeteorWallet()]}).catch(error=>{initializing=null;throw error;});
  const selector=await initializing;
  const wallet=await selector.wallet('meteor-wallet');
  if(connect)await wallet.signIn({contractId:cfg.exchange,methodNames:['get_state']});
  const [selected]=await wallet.getAccounts();
  if(!selected?.accountId)throw Error('Open Meteor and select a NEAR mainnet account.');
  return {wallet,owner:selected.accountId,selector};
}
export async function tradingPermission(owner){
  const {wallet,owner:current}=await meteorAccount(false);
  if(current!==owner)throw Error('Meteor account changed. Reconnect to continue.');
  const [selected]=await wallet.getAccounts();
  if(!selected?.publicKey)return null;
  for(const endpoint of ['https://free.rpc.fastnear.com','https://near.drpc.org']){
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'query',params:{request_type:'view_access_key',account_id:owner,public_key:selected.publicKey,finality:'final'}}),signal:AbortSignal.timeout(4000)});
      const data=await response.json();
      if(response.ok&&data.result)return isTradingPermission(data.result.permission,cfg.exchange)?{publicKey:selected.publicKey}:null;
      if(data.error?.cause?.name==='UNKNOWN_ACCESS_KEY')continue;
    }catch{}
  }
  throw Error('Unable to verify trading permission. Retry.');
}
export async function enableTrading(owner){
  const {wallet,owner:current}=await meteorAccount(false);
  if(current!==owner)throw Error('Meteor account changed.');
  await wallet.signIn({contractId:cfg.exchange,methodNames:[...tradingMethods]});
  // Finalized RPC reads can briefly trail the wallet confirmation.
  for(let attempt=0;attempt<8;attempt++){
    try{const permission=await tradingPermission(owner);if(permission)return permission;}catch(error){if(/account changed/i.test(error.message))throw error;}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  return {pending:true}; // The dashboard restores the wallet once and keeps checking automatically.
}
export async function revokeTrading(owner){
  const permission=await tradingPermission(owner);
  if(!permission)throw Error('No active trading permission found.');
  const {wallet,owner:current}=await meteorAccount(false);
  if(current!==owner)throw Error('Meteor account changed.');
  const result=await wallet.signAndSendTransaction({signerId:owner,receiverId:owner,actions:[internalActionToNaj({type:'DeleteKey',params:{publicKey:permission.publicKey}})]});
  if(result?.status?.Failure||result?.receipts_outcome?.some(r=>r.outcome.status?.Failure))throw Error('Revocation failed. Check Meteor activity.');
  if(!result?.status||!Object.hasOwn(result.status,'SuccessValue'))throw Error('Revocation not confirmed. Check Meteor activity.');
  return result;
}
export async function signNear(owner,receiverId,methodName,args,deposit,oneClick=false){
  const {wallet,owner:current}=await meteorAccount(false);
  if(current!==owner)throw Error('Meteor account changed. Reconnect to continue.');
  if(oneClick&&(!isTradingCall(cfg.exchange,receiverId,methodName,deposit)||!await tradingPermission(owner)))throw Error('Enable one-click trading again before continuing.');
  return wallet.signAndSendTransaction({signerId:owner,receiverId,actions:[internalActionToNaj({type:'FunctionCall',params:{methodName,args,gas:'200000000000000',deposit}})]});
}
