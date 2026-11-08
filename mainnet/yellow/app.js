import {setupWalletSelector,internalActionToNaj} from '@near-wallet-selector/core';
import {setupMeteorWallet} from '@near-wallet-selector/meteor-wallet';
import {Buffer} from 'buffer';
import cfg from '../config.json';
globalThis.Buffer ??= Buffer;
const $=s=>document.getElementById(s), target=110000000, usd=n=>(n/1e6).toLocaleString('en-US',{style:'currency',currency:'USD'}), rpc='https://rpc.mainnet.near.org';
let wallet,id,step,busy=false,mode=location.hash==='#trader'?'trade':'lp',epoch=0;
async function view(account,method,args={}){
const r=await fetch(rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'query',params:{request_type:'call_function',account_id:account,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),finality:'final'}})});
const d=await r.json();if(!d.result?.result)throw Error('Cannot read finalized NEAR state. Refresh to retry.');return JSON.parse(Buffer.from(d.result.result).toString());}
async function connect(){const sel=await setupWalletSelector({network:'mainnet',modules:[setupMeteorWallet()]});wallet=await sel.wallet('meteor-wallet');const accounts=await wallet.signIn({contractId:cfg.exchange,methodNames:['get_state']});id=accounts[0]?.accountId;if(!id)throw Error('No Meteor account selected.');}
async function render(){const seq=++epoch;step=null;$('action').disabled=true;$('action').textContent='Checking mainnet…';$('rows').replaceChildren();
for(const m of ['lp','trade'])$(m).classList.toggle('active',m===mode);
$('label').textContent=mode==='lp'?'LIQUIDITY PROVIDER':'BTC · 500×';$('title').textContent=mode==='lp'?'Your liquidity':'Trading status';$('desc').textContent=mode==='lp'?'Fund the exchange balance first. Then move USDC into the vault for LP shares.':'This pilot uses verified BTC prices on NEAR.';
const s=await view(cfg.exchange,'get_state');if(seq!==epoch)return;
const a=s.accounts[id],rows=mode==='lp'?[['Vault liquidity',usd(s.capital)],...(id?[['Your LP position',usd(s.shares?Math.floor((a?.shares??0)*s.capital/s.shares):0)],['Exchange balance',usd(a?.balance??0)]]:[])]:[['Entries',s.paused?'Paused':'Enabled'],['Last verified BTC price',s.price?String(s.price):'Awaiting price']];
let label='Connect Meteor',call=connect;
if(id){$('login').textContent=id;if(mode==='trade'){label='View liquidity';call=async()=>{mode='lp'};}
else if(id!==cfg.owner){label='Owner pilot only';call=null;}
else if(!a){label='Register · 0.1 NEAR';call=()=>tx(cfg.exchange,'register',{},'100000000000000000000000');}
else if((a.shares??0)>0){label='Liquidity added';call=null;}
else if(a.balance<target){const reg=await view(cfg.token,'storage_balance_of',{account_id:cfg.exchange});if(!reg){const {min}=await view(cfg.token,'storage_balance_bounds');label='Register vault for USDC';call=()=>tx(cfg.token,'storage_deposit',{account_id:cfg.exchange,registration_only:true},min);}
else{const amt=target-a.balance,bal=BigInt(await view(cfg.token,'ft_balance_of',{account_id:id}));label=bal<BigInt(amt)?'Insufficient wallet USDC':'Deposit '+usd(amt)+' USDC';call=bal<BigInt(amt)?null:()=>tx(cfg.token,'ft_transfer_call',{receiver_id:cfg.exchange,amount:String(amt),msg:'deposit'},'1');}}
else{label='Add 110 USDC liquidity';call=()=>tx(cfg.exchange,'add_liquidity',{amount:String(target)},'0');}}
if(seq!==epoch)return;for(const [k,v] of rows){const row=document.createElement('div');row.className='row';const key=document.createElement('span'),val=document.createElement('strong');key.textContent=k;val.textContent=v;row.append(key,val);$('rows').append(row);}step=call;$('action').textContent=label;$('action').disabled=busy||!call;}
async function tx(receiverId,methodName,args,deposit){const out=await wallet.signAndSendTransaction({signerId:id,receiverId,actions:[internalActionToNaj({type:'FunctionCall',params:{methodName,args,gas:'200000000000000',deposit}})]});if(!out||out.status?.Failure||out.receipts_outcome?.some(x=>x.outcome.status?.Failure))throw Error('Transaction not confirmed. Refresh before retrying.');if(methodName==='ft_transfer_call'&&Buffer.from(out.status?.SuccessValue??'','base64').toString()!==JSON.stringify(args.amount))throw Error('Full deposit not confirmed. Check your wallet and exchange balance before retrying.');$('status').textContent='Submitted. Check the updated balance below.';}
async function run(fn){if(busy)return;busy=true;for(const k of ['lp','trade','login','refresh','action'])$(k).disabled=true;$('status').textContent='';try{await fn?.();}catch(e){$('status').textContent=e.message;}finally{busy=false;for(const k of ['lp','trade','login','refresh'])$(k).disabled=false;try{await render()}catch(e){$('action').textContent='Status unavailable';$('status').textContent=e.message;}}}
$('action').onclick=()=>run(step);$('login').onclick=()=>run(connect);$('refresh').onclick=()=>run();for(const k of ['lp','trade'])$(k).onclick=()=>run(()=>{mode=k;location.hash=k==='lp'?'lp':'trader'});run();
