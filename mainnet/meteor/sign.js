import {setupWalletSelector} from '@near-wallet-selector/core';
import {setupMeteorWallet} from '@near-wallet-selector/meteor-wallet';
import {Buffer} from 'buffer';
import wasmUrl from '../../artifacts/near_purple_exchange_verified.wasm?url';
import pilot from '../config.json';
import oracle from '../pyth-candidate.json';
globalThis.Buffer ??= Buffer;
const expectedHash = 'cfa074ddc62caa47fac49e2cabe389132c05a5e43b49e07f7cc59094c263d1ac';
const el = id => document.getElementById(id);
async function query(params) {
  const response = await fetch('/rpc', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'query',params:{...params,finality:'final'}})});
  if (!response.ok) throw Error('Mainnet RPC unavailable');
  return response.json();
}
let wallet;
async function preflight() {
  const {result,error} = await query({request_type:'view_account',account_id:pilot.plannedExchange});
  if (result) throw Error('The exchange account already exists. Check its deployment on NearBlocks.');
  if (error?.cause?.name !== 'UNKNOWN_ACCOUNT') throw Error('Could not verify exchange account status');
}
el('connect').onclick = async () => {
  el('connect').disabled=true;
  el('review').hidden=true;
  el('status').textContent='Waiting for Meteor…';
  try {
    const selector = await setupWalletSelector({network:'mainnet',modules:[setupMeteorWallet()]});
    wallet = await selector.wallet('meteor-wallet');
    const accounts = await wallet.signIn({contractId:pilot.owner,methodNames:['get_state']});
    if (accounts[0]?.accountId !== pilot.owner) throw Error('Select yellowhands.near in Meteor');
    await preflight();
    const {result} = await query({request_type:'view_access_key_list',account_id:pilot.owner});
    const keys = result.keys.filter(k=>k.access_key.permission==='FullAccess');
    if (!keys.length) throw Error('No owner key found');
    el('key').replaceChildren(new Option('Select your public key',''),...keys.map(k=>new Option(k.public_key,k.public_key)));
    el('review').hidden=false;
    el('status').textContent='Connected to NEAR mainnet';
  } catch(e) {el('status').textContent=e.message;} finally {el('connect').disabled=false;}
};
el('deploy').onclick = async () => {
  el('deploy').disabled=true;
  try {
    const key=el('key').value;
    if (!key) throw Error('Select your Meteor public key');
    await preflight();
    const code=new Uint8Array(await (await fetch(wasmUrl)).arrayBuffer());
    const hash=Buffer.from(await crypto.subtle.digest('SHA-256',code)).toString('hex');
    if (hash!==expectedHash) throw Error('Contract build hash mismatch');
    const args={token:pilot.token,guardian:pilot.owner,signer:Array.from(Buffer.from(oracle.signerHex,'hex')),signer_expires_at:oracle.signerExpiresAt,feed:oracle.candidateFeed,channel:oracle.candidateChannel,max_confidence_bps:5};
    const tx=await wallet.signAndSendTransaction({signerId:pilot.owner,receiverId:pilot.plannedExchange,actions:[
      {type:'CreateAccount'},
      {type:'Transfer',params:{deposit:'3500000000000000000000000'}},
      {type:'AddKey',params:{publicKey:key,accessKey:{permission:'FullAccess'}}},
      {type:'DeployContract',params:{code}},
      {type:'FunctionCall',params:{methodName:'new_verified',args,gas:'100000000000000',deposit:'0'}}
    ]});
    el('status').textContent='Check the final receipt on NearBlocks. '+(tx?.transaction?.hash??'');
  } catch(e) {el('status').textContent=e.message;} finally {el('deploy').disabled=false;}
};
