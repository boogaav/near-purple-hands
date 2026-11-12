import {createTradeSharer,shareModel,handsAndCoins} from '../../trade-share.mjs';
const signed=n=>(n>0?'+':n<0?'−':'')+'$'+(Math.abs(n)/1e6).toFixed(2);
export function confirmedResult(position,rows){
 const r=rows?.find(r=>r.id===position?.id&&r.owner===position?.owner&&r.finalized===true&&/^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(r.hash));
 if(!r||!['net','payout','fee','entry','exit','duration'].every(k=>Number.isSafeInteger(r[k]))||!(position.margin>0))return null;
 return {...r,position,roi:r.net/position.margin*100};
}
export function mountNearResult(root,key){
 const panel=root.querySelector('#p-result'),arena=root.querySelector('.p-arena'),sharer=createTradeSharer();
 root.querySelector('.p-header').after(panel);
 let stored={};try{stored=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
 let current=null,lastKey='';
 const save=()=>localStorage.setItem(key,JSON.stringify(stored));
 const hide=()=>{panel.hidden=true;arena.hidden=false;root.dataset.nearResult='false';};
 function update(state){
  if(!state)return;
  if(state.position?.entry){stored.position={...state.position,owner:state.owner};save();hide();return;}
  const p=stored.position;
  if(!p||stored.dismissed===p.id||state.position){hide();return;}
  current=confirmedResult(p,[...(state.service?.settlements||[]),...(stored.result?[stored.result]:[])]);
  if(current){stored.result=current;save();}
  const version=p.id+':'+(current?.hash||'pending');
  panel.hidden=false;arena.hidden=true;root.dataset.nearResult='true';
  if(lastKey===version)return;lastKey=version;
  const percent=current?(current.roi>0?'+':'')+current.roi.toFixed(1)+'%':'—';
  panel.innerHTML='<div class="p-result-actions"><button class="p-back" data-near="result-back">← Back to trading</button><button class="p-share" data-near="result-share" '+(!current?'disabled':'')+'>Share ↗</button>'+(current?'<a class="p-back" href="https://nearblocks.io/txns/'+current.hash+'" target="_blank" rel="noopener">Receipt ↗</a>':'')+'<button class="yh-result-close" data-near="result-back" aria-label="Close result">×</button></div><div class="p-result-symbol" id="p-result-symbol">'+handsAndCoins()+'</div><div class="p-status">'+(p.long?'LONG':'SHORT')+' · '+p.leverage+'× · NEAR</div><h1 tabindex="-1">'+(current?'Trade settled.':'Confirming your result…')+'</h1><div class="p-result-value p-mono" data-sign="'+(!current||current.net===0?'neutral':current.net>0?'profit':'loss')+'">'+percent+'</div><p>'+(current?signed(current.net)+' net P&L · after protocol fees':'Position closed. Waiting for the finalized settlement receipt.')+'</p>'+(current?'<div class="p-receipt"><div><span>Journey</span><strong>'+current.duration+' seconds</strong></div><div><span>Trade payout</span><strong>$'+(current.payout/1e6).toFixed(2)+'</strong></div></div><details class="yh-result-fees"><summary aria-label="Fees and execution details">?</summary><div class="yh-result-fee-body"><p>Entry $'+(current.entry/1e6).toFixed(2)+' → Exit $'+(current.exit/1e6).toFixed(2)+'</p><p>Protocol fees $'+(current.fee/1e6).toFixed(2)+'. Net P&L includes protocol charges. Unused execution escrow is returned separately. Network gas is excluded.</p></div></details>':'<p>Your balance updates automatically. This card stays here until you close it.</p>');
  panel.querySelector('h1').focus({preventScroll:true});
 }
 return {update,action:async key=>{
  if(key==='result-back'){stored.dismissed=stored.position?.id;save();hide();root.querySelector('[data-enter=up]')?.focus();}
  if(key==='result-share'&&current)sharer.open(shareModel({side:current.position.long?'long':'short',leverage:current.position.leverage,margin:current.position.margin/1e6,pnl:current.net/1e6,theme:'yellow',percentageOnly:true}));
 }};
}
