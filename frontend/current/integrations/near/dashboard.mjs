import {mountChemistryPanel} from '../../public/yh-chemistry-panel.js';
import {nearChemistry} from './chemistry.mjs';
import {mountNearResult} from './result.mjs';
import {RESULT_CSS} from '../owned-v5/result-ui.mjs';
import {BtcLiveFeed} from '../../btc-live-feed.mjs';
import {cfg,entryBlock,fresh,parseAmount,scope,snapshot,depositLimit,walletBalance,grossResult,verifiedService} from './state.mjs';
import {livePnl,exitReference,orderProgress} from './presentation.mjs';
import {tradingMethods} from './trading-permission.mjs';
import {nearPreference,confirmedMeteor,leaveNear} from './account.mjs';
import {initBrandTheme} from '../../brand-theme.mjs';
import {initDesktopLayout} from '../../desktop-layout.mjs';
import {initTradeHands} from '../../trade-hands.mjs';
import {initHeaderTagline} from '../../header-tagline.mjs';
import {LivePriceChart} from '../../live-price-chart.mjs';
import {CSS} from '../owned-v5/styles.mjs';
import {FOCUS_CSS} from '../owned-v5/trade-focus.mjs';
import {LAYOUT_CSS,tidyFooter} from '../owned-v5/layout.mjs';

const NEAR_LAYOUT = `
#purple-hands-play .yh-chemistry-toggle{min-width:44px;min-height:44px;border:1px solid var(--p-line);border-radius:10px;background:var(--p-raised);color:var(--p-ink);cursor:pointer;margin-bottom:8px}
#purple-hands-play .yh-chemistry-sidebar[data-collapsed=true]{padding:0;border:0;overflow:visible;background:none;align-self:start}
#purple-hands-play .yh-chemistry-sidebar[data-collapsed=true] .yh-chemistry-toggle{margin:0}
#purple-hands-play .yh-chemistry-content[hidden]{display:none!important}
@media(min-width:1100px){html #purple-hands-play[data-owned=true][data-workspace-mode=trader] .p-terminal.yh-chemistry-collapsed:has(.yh-chemistry-sidebar){grid-template-columns:minmax(0,1fr) 44px}}
@media(max-width:1099px){html #purple-hands-play .yh-chemistry-sidebar[data-collapsed=true]{height:44px;max-height:44px}}

#purple-hands-play .yh-chemistry-sidebar{min-width:0;padding:12px;border:1px solid var(--p-line);border-radius:16px;color:var(--p-dim);font:12px/1.5 system-ui;overflow:auto;max-height:340px}
#purple-hands-play .yh-chemistry-sidebar input{width:100%;box-sizing:border-box}
#purple-hands-play .yh-chemistry-sidebar :is(button,summary){min-height:40px}
#purple-hands-play .yh-chemistry-sidebar small{display:block;margin:8px 0}
#purple-hands-play[data-workspace-mode=lp] .yh-chemistry-sidebar{display:none}
@media(min-width:1100px){
 html #purple-hands-play[data-owned=true][data-workspace-mode=trader] .p-terminal:has(.yh-chemistry-sidebar){display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:12px;align-items:stretch}
 html #purple-hands-play[data-owned=true][data-workspace-mode=trader] .p-terminal>.p-marketbar,html #purple-hands-play[data-owned=true][data-workspace-mode=trader] .p-terminal>.p-sourcebar{grid-column:1/-1}
 html #purple-hands-play[data-owned=true][data-workspace-mode=trader] .p-terminal>#p-trading{grid-column:1;min-width:0}
 html #purple-hands-play[data-owned=true][data-workspace-mode=trader] .p-terminal>.yh-chemistry-sidebar{grid-column:2;grid-row:3;max-height:50svh}
 html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-terminal:has(.yh-chemistry-sidebar){grid-template-rows:minmax(0,1fr)}
 html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-terminal>#p-trading,html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-terminal>.yh-chemistry-sidebar{grid-row:1}
 html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-terminal>.yh-chemistry-sidebar{height:50svh;box-sizing:border-box}
}

html #purple-hands-play[data-owned=true] .p-arena:has(#near-road){display:flex;flex-direction:column;align-items:stretch}
html #purple-hands-play[data-owned=true] .p-arena:has(#near-road)>.p-stage{flex:1;min-height:0;width:100%}
#purple-hands-play #near-road{flex:none}

#purple-hands-play #near-road{width:min(760px,calc(100% - 24px));box-sizing:border-box;margin:12px auto;padding:14px 18px;border:1px solid var(--p-line);border-radius:16px;display:flex;align-items:center;gap:14px;background:var(--p-surface)}
#purple-hands-play[data-workspace-mode=lp] #near-road,#purple-hands-play[data-near-result=true] #near-road{display:none}
#purple-hands-play .near-road-body{min-width:0;flex:1}
#purple-hands-play #near-road .near-order{border:0;background:none;padding:0;font-size:13px;margin-bottom:12px;line-height:1.4}
#purple-hands-play #near-road ol{display:flex;gap:8px;list-style:none;margin:0;padding:0}
#purple-hands-play #near-road li{flex:1;min-width:0;position:relative;color:var(--p-dim);font-size:11px}
#purple-hands-play #near-road li:before{content:'';display:block;height:3px;background:var(--p-line);border-radius:3px;margin-bottom:8px}
#purple-hands-play #near-road li[data-state=done]:before{background:#25d99c}
#purple-hands-play #near-road li[data-state=current]{color:#f0b90b;font-weight:700}
#purple-hands-play #near-road li[data-state=current]:before{background:#f0b90b}
#purple-hands-play #near-road button{background:none;border:0;color:inherit;padding:0;font:inherit;text-align:left;cursor:pointer;min-height:32px}
#purple-hands-play #near-road-bird{width:80px;flex:none}
#purple-hands-play #near-road-bird svg{display:block;width:64px;height:64px}
@media(max-width:500px){#purple-hands-play #near-road{padding:12px;gap:8px}#purple-hands-play #near-road-bird,#purple-hands-play #near-road-bird svg{width:42px;height:42px}#purple-hands-play #near-road li{font-size:10px}}

html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-chart-container{flex:none;height:50svh;min-height:240px}
html #purple-hands-play[data-owned=true][data-trade-focus=true] :is(.p-terminal,#p-trading){flex:none;height:auto}

html #purple-hands-play[data-owned=true][data-trade-focus=true] #p-live-hero{display:flex;flex-direction:column;gap:4px;padding:16px 12px 8px}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-stage{display:flex;flex-direction:column;width:100%;max-width:1440px;height:auto}
html #purple-hands-play[data-owned=true][data-trade-focus=true] #p-ready-hero{display:none}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-terminal{width:100%;box-sizing:border-box}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout{width:min(480px,90vw);height:64px}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout-label{font-size:28px}

#purple-hands-play[data-near-result=true] .p-arena{display:none!important}
#purple-hands-play #p-result{width:min(620px,100%);margin:20px auto;text-align:center}
#purple-hands-play #p-result .p-result-actions a{padding:12px;border-radius:12px;text-decoration:none}

#purple-hands-play[data-owned=true][data-trade-focus=true] #p-live-hero{width:100%;box-sizing:border-box;text-align:center;padding:8px 16px 4px;margin:0 auto;flex-shrink:0}
#purple-hands-play[data-owned=true][data-trade-focus=true] #p-roi{font-size:clamp(48px,6vw,76px);font-weight:750;line-height:1.05;letter-spacing:-2px;margin:4px 0 6px}
#purple-hands-play[data-owned=true][data-trade-focus=true] #p-pnl{font-size:14px;font-weight:650;letter-spacing:0}

#purple-hands-play #near-trading-permission{border:1px solid #f0b90b;border-radius:12px;min-height:44px;padding:10px 14px;background:#f0b90b;color:#181a20;text-decoration:none;font-weight:650}
#purple-hands-play #near-trading-permission[data-enabled=true]{background:#103c30;color:#73f4bd;border-color:#259c74}
#purple-hands-play .near-order{padding:14px;border:1px solid #786026;background:#302a1c;border-radius:12px;font-size:13px;line-height:1.5}
#purple-hands-play .near-order[hidden]{display:none}
#purple-hands-play .near-order-track{display:flex;gap:6px;margin-top:10px}
#purple-hands-play .near-order-track span{height:4px;flex:1;background:#4a4536;border-radius:4px}
#purple-hands-play .near-order-track span.done{background:#f0b90b}
#purple-hands-play .near-order[data-active=true] .near-order-track span.current{background:#f0b90b;animation:near-order-pulse 1s ease-in-out infinite alternate}
@keyframes near-order-pulse{to{opacity:.25}}
@media(prefers-reduced-motion:reduce){#purple-hands-play .near-order-track span.current{animation:none!important}}

#purple-hands-play[data-workspace-mode=lp] .p-terminal,
#purple-hands-play[data-workspace-mode=lp] #p-trading {display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:16px;height:auto;overflow:visible}
#purple-hands-play[data-workspace-mode=lp] :is(.p-marketbar,.p-sourcebar,.p-chart-foot) {display:none}
#purple-hands-play #near-pool {padding:16px;line-height:1.6}
#purple-hands-play .near-lp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
#purple-hands-play .near-lp-grid>div{padding:14px;border:1px solid var(--p-line);border-radius:14px}
#purple-hands-play .near-lp-grid strong{font-size:24px}
#purple-hands-play #near-amount{width:100%;box-sizing:border-box;padding:14px;border:1px solid var(--p-line);border-radius:12px;background:var(--p-bg);color:var(--p-ink);font-size:20px}
#purple-hands-play #near-pool>strong {display:block;font-size:clamp(36px,4vw,52px);line-height:1.15;margin:8px 0 24px;overflow-wrap:anywhere}
html #purple-hands-play[data-workspace-mode=lp] .p-stage{width:100%;max-width:1200px;min-width:0;margin-inline:auto;grid-template-columns:minmax(0,1fr) 280px}
html #purple-hands-play[data-workspace-mode=lp] :is(.p-terminal,.p-control-panel,#near-pool){min-width:0;box-sizing:border-box}
html #purple-hands-play[data-workspace-mode=lp] .p-terminal{width:100%;padding:12px}
#purple-hands-play #near-pool .near-lp-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
#purple-hands-play #near-pool .near-lp-grid>div{min-width:0;padding:16px}
#purple-hands-play #near-pool .near-lp-grid span{display:block;font-size:12px;color:var(--p-dim);line-height:1.4}
#purple-hands-play #near-pool .near-lp-grid strong{display:block;font-size:clamp(18px,2vw,26px);line-height:1.25;margin-top:8px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
#purple-hands-play .near-lp-note{font-size:13px;color:var(--p-dim);margin:16px 0;line-height:1.5}
#purple-hands-play .near-lp-bottom{margin-top:24px;padding-top:20px;border-top:1px solid var(--p-line);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}
#purple-hands-play .near-lp-bottom button{min-height:44px;padding:10px 16px;border:1px solid var(--p-line);border-radius:12px;background:var(--p-raised);color:var(--p-ink);cursor:pointer}
#purple-hands-play .near-lp-bottom details{font-size:13px;color:var(--p-dim);max-width:100%}
#purple-hands-play .near-lp-bottom summary{cursor:pointer;min-height:44px;display:flex;align-items:center}
#purple-hands-play .near-activity-row{padding:14px 0;border-bottom:1px solid var(--p-line);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;font-size:13px}
#purple-hands-play .near-activity-row small{display:block;color:var(--p-dim);margin-top:4px;overflow-wrap:anywhere}
@media(max-width:900px){html #purple-hands-play[data-workspace-mode=lp] .p-stage{display:flex;flex-direction:column}#purple-hands-play #near-pool{padding:12px}#purple-hands-play #near-pool .near-lp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:360px){#purple-hands-play #near-pool .near-lp-grid{grid-template-columns:1fr}}
#purple-hands-play #p-ready-hero:has(.near-tabs) {display:flex;flex-direction:column;position:static;height:auto;gap:12px;align-items:stretch}
#purple-hands-play .near-tabs {display:inline-flex;align-self:flex-start;padding:3px;border:1px solid #454951;border-radius:10px}
#purple-hands-play .near-tabs button {background:transparent;color:var(--p-dim);border:0;border-radius:7px;padding:8px 16px;font:inherit;cursor:pointer}
#purple-hands-play .near-tabs button[aria-pressed=true] {background:#f0b90b;color:#181a20}
#purple-hands-play #near-actions {display:grid;gap:10px}
#purple-hands-play #near-actions button {position:static;margin:0;width:100%;height:auto;min-height:44px}
`;
const root=document.querySelector('#purple-hands-play');
const $=selector=>root.querySelector(selector);
const put=(selector,value)=>{$(selector).textContent=value;};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'$'+(Number(n)/1e6).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const btn=(key,title)=>`<button type="button" class="p-primary" data-near="${key}">${title}</button>`;
const view=$('#p-dialog-body'),overlay=$('#p-overlay');
const modal=(title,body)=>{overlay.hidden=false;view.innerHTML='<h2>'+escape(title)+'</h2>'+body;};
const close=()=>{if(review?.method==='request_open'&&!busy)chemistry?.cancel();overlay.hidden=true;view.replaceChildren();review=null;};
const expected=sessionStorage.getItem(nearPreference);
const controller=new AbortController();
let walletUSDC=null,tradingEnabled=false,liveMarket=null,orderAttempt=null;
const permissionPendingKey='yellowhands:near:permission-pending:'+scope(expected);
let permissionPending=null;try{permissionPending=JSON.parse(sessionStorage.getItem(permissionPendingKey)||'null');}catch{}
if(permissionPending&&Date.now()-permissionPending.started>90000){permissionPending=null;sessionStorage.removeItem(permissionPendingKey);}
let snapshotValue=null,reading=false,busy=false,accountConfirmed=false,mode=location.hash==='#liquidity'?'lp':'trader',message='',review=null;
let subscription,chart,marketFeed,resultUI,chemistry;
function leave(){
  chemistry?.destroy();controller.abort();marketFeed?.stop();subscription?.unsubscribe();chart?.destroy();root.hidden=true;view.replaceChildren();
  leaveNear();
}
async function identity(){
  const current=await confirmedMeteor(false);
  if(controller.signal.aborted||current.owner!==expected){throw Error('Meteor account changed.');}
  return current;
}
const journalKey='yellowhands:transactions:'+scope(expected);
function journal(){return JSON.parse(localStorage.getItem(journalKey)||'[]');}
function receiptLinks(){
  const settled=snapshotValue?.service?.settlements||[];
  const rows=[...settled.map(r=>({method:'Settlement',status:'Net P&L '+money(r.net),hash:r.hash})),...journal()];
  const coverage=snapshotValue?.service;
  const notice=coverage?.historyComplete?'':coverage?.indexedThroughBlock
    ? '<p>Partial settlement history through block '+coverage.indexedThroughBlock+'.</p>'
    : '<p>Finalized settlement history unavailable.</p>';
  return notice+(rows.length?rows.map(r=>'<div class="near-activity-row"><div>'+escape(({request_open:'Open trade',request_close:'Close trade',add_liquidity:'Add liquidity',request_remove:'Request removal',process_remove:'Claim liquidity',cancel_remove:'Cancel removal',ft_transfer_call:'Load funds',withdraw:'Withdraw',register:'Account setup',storage_deposit:'Wallet setup',cancel_open:'Cancel entry'})[r.method]||r.method)+'<small>'+escape(r.status)+'</small></div>'+(r.hash?'<a target="_blank" rel="noopener" href="https://nearblocks.io/txns/'+encodeURIComponent(r.hash)+'">Receipt ↗</a>':'')+'</div>').join('') :coverage?.historyComplete?'<p>No settlements or local wallet activity.</p>':'');
}
function writeRecord(record){localStorage.setItem(journalKey,JSON.stringify([record,...journal().filter(x=>x.id!==record.id)].slice(0,100)));}
function render(){
  const s=snapshotValue,p=s?.position,filled=!!p?.entry,lp=mode==='lp',owner=expected===cfg.owner;
  root.dataset.phase=filled?'active':'ready';root.dataset.tradeFocus=String(filled&&!lp);
  root.dataset.workspaceMode=mode;
  for(const tab of root.querySelectorAll('.near-tabs button'))tab.setAttribute('aria-pressed',String(tab.dataset.near===mode));chart?.setTradeFocus(filled&&!lp);
  $('#p-balance-label').hidden=false;const trading=BigInt(s?.account?.balance??0)>0n;
  put('#p-balance-label',trading?'TRADING BALANCE · NEAR':'WALLET USDC · NEAR');
  put('#p-balance',trading?money(s.account.balance):walletUSDC===null?'Loading…':money(walletUSDC));
  if($('#near-wallet-value'))put('#near-wallet-value',walletUSDC===null?'Loading…':money(walletUSDC));
  const toggle=$('#near-trading-permission');if(toggle){toggle.dataset.enabled=String(tradingEnabled);toggle.textContent=tradingEnabled?'✓ Trading enabled · Manage':permissionPending?'Confirming approval…':'Enable one-click trading';toggle.disabled=busy||!!permissionPending;toggle.hidden=lp||!owner;}
  $('#p-entry-controls').hidden=filled||lp;$('.p-hands').hidden=lp||filled;
  $('#p-live-hero').hidden=!filled||lp;$('#p-active-controls').hidden=!filled||lp;
  $('#p-chart').hidden=lp;$('#near-pool').hidden=!lp;
  const reason=s?entryBlock(s):'Reading finalized NEAR state…';
  put('#near-state',(p?.close?(s.height>p.close.until?'Close request expired':'Confirming exit price…'):lp?(/trading permission/i.test(message)?'':message):reason||message||'Ready to trade'));
  for(const b of root.querySelectorAll('[data-enter]'))b.disabled=busy||!s||!!reason;
  $('.p-cashout').disabled=busy||!s||!filled||!!(p?.close&&s.height<=p.close.until);
  renderLivePnl();renderOrderProgress();
  put('#p-leverage','500×');const price=s?.engine.price;
  put('#p-mark',price?money(price):'—');put('#p-quote-status',price?(fresh(s)?'Verified BTC price':'Price delayed'):'Waiting for verified BTC price');
  if(s){
    const metric=(label,value)=>'<div><span>'+label+'</span><strong>'+escape(value)+'</strong></div>';
    const detailsOpen=$('#near-lp-details')?.open;
    $('#near-pool').innerHTML='<h2>Your liquidity</h2><strong>'+money(s.shareValue)+'</strong><div class="near-lp-grid">'+metric('Total pool',money(s.engine.capital))+metric('Available',money(s.engine.capital-s.engine.reserved))+metric('In use',money(s.engine.reserved))+metric('Pool P&L',money(s.engine.lp_pnl))+metric('Your LP P&L','—')+'</div><p class="near-lp-note">Your LP P&L is not available yet. Pool P&L reflects the whole vault.</p><div class="near-lp-bottom"><button type="button" data-near="history">Your activity ↗</button><details id="near-lp-details" '+(detailsOpen?'open':'')+'><summary>Pool details +</summary><p>LP shares: '+Number(s.account?.shares??0).toLocaleString('en-US')+'</p><p>Available liquidity can be used for trades; in-use liquidity is reserved for open positions.</p><p>Personal P&L needs a verified deposit cost basis. Full pool trade history is not available yet.</p></details></div>';

    const r=s.account?.redemption;
    $('#near-actions').innerHTML=lp&&owner?(r?'<p>Removal available '+escape(new Date(r.ready_at*1000).toLocaleString())+' · <span id="near-removal-countdown" data-ready="'+r.ready_at+'">'+Math.max(0,r.ready_at-Math.floor(Date.now()/1000))+' seconds</span></p>'+btn('cancel_remove','Cancel removal')+(Date.now()/1000>=r.ready_at&&!Object.keys(s.engine.positions).length?btn('process_remove','Claim to exchange balance'):''):(s.account?.balance?btn('add_liquidity','Add liquidity'):'')+(s.account?.shares?btn('request_remove','Request removal'):'')):p&&!filled&&s.height>p.open.until?btn('cancel_open','Cancel expired entry'):'';
    chart.setEntry(filled?{time:p.opened_at*1000,price:p.entry/1e6}:null);

  }
}
function renderLivePnl(){
 const p=snapshotValue?.position;if(!p?.entry)return;
 put('#p-live-status',(p.long?'LONG':'SHORT')+' · 500× · NEAR');
 const pnl=livePnl(p,liveMarket),roi=pnl===null?null:Number(pnl)/p.margin*100;
 put('#p-roi',roi===null?'—':(roi>0?'+':'')+roi.toFixed(1)+'%');
 put('#p-pnl',pnl===null?'—':(pnl>0n?'+':'')+money(pnl));
 for(const id of ['#p-roi','#p-pnl'])$(id).dataset.sign=pnl===null||pnl===0n?'neutral':pnl>0n?'profit':'loss';
 put('#p-pnl-label',pnl===null?'Live price reconnecting':'Live estimate · before fees');
 put('#p-pnl-reference','Chart price estimate. Final P&L uses verified settlement.');
 $('#p-pnl-reference').removeAttribute('title');
}
function renderOrderProgress(){
 const state=snapshotValue,p=state?.position,progress=orderProgress(orderAttempt,p,state?.height??0),road=$('#near-road');if(!road)return;
 const exiting=p?.close||orderAttempt?.method==='request_close';
 const filled=!!p?.entry;
 let steps=exiting?['Request exit','Verify price','Settle']:['Enable trading','Get price','Submit order','Filled'];
 let step=exiting?(p?.close?1:0):filled?4:p?3:orderAttempt?2:!tradingEnabled?0:state&&fresh(state)?2:1;
 let title=(permissionPending?'Confirming trading permission · checking automatically':null)||progress?.title||(filled?'In position · EXIT when you’re ready':!tradingEnabled?'Enable one-click trading, or confirm each trade in Meteor':state&&fresh(state)?'Ready · choose UP or DOWN':'Getting a verified BTC price…');
 if(!tradingEnabled&&(p||orderAttempt)&&!exiting)steps[0]='Wallet confirmed';
 if(!exiting&&p&&!p.entry)steps[3]='Filling';
 const node=road.querySelector('.near-order');
 if(node.textContent!==title)node.textContent=title;
 const signature=steps.join('|')+step;
 if(road.dataset.steps!==signature){road.dataset.steps=signature;road.querySelector('ol').innerHTML=steps.map((label,i)=>'<li data-state="'+(i<step?'done':i===step?'current':'next')+'"'+(i===step?' aria-current="step"':'')+'>'+(i<step?'✓ ':'')+(i===0&&!tradingEnabled&&!exiting&&!p?'<button data-near="trading-settings">'+label+'</button>':label)+'</li>').join('');}
}

async function refresh(){
  if(reading||controller.signal.aborted)return;
  reading=true;
  try{await identity();
    if(walletUSDC===null){const amount=await walletBalance(expected,controller.signal);await identity();walletUSDC=amount;render();}
    try{const sdk=await import(METEOR_MODULE_URL);tradingEnabled=!!await sdk.tradingPermission(expected);}catch{tradingEnabled=false;}
    if(permissionPending&&(tradingEnabled||Date.now()-permissionPending.started>90000)){permissionPending=null;sessionStorage.removeItem(permissionPendingKey);if(tradingEnabled)message='One-click trading enabled';else message='Approval is taking longer. Check Meteor; we’ll keep checking here.';}
    const next=await snapshot(expected,controller.signal);await identity();walletUSDC=next.wallet;try{
      const res=await fetch('/api/near/status?owner='+encodeURIComponent(expected),{signal:controller.signal,cache:'no-store'});
      if(res.ok)next.service=verifiedService(next,await res.json());
    }catch{}
    await identity();if(orderAttempt?.phase==='accepted'&&((orderAttempt.method==='request_open'&&next.position?.entry)||(orderAttempt.method==='request_close'&&!next.position)))orderAttempt=null;
    if(orderAttempt?.method==='request_open'&&orderAttempt.phase==='accepted'&&snapshotValue?.position&&!next.position)orderAttempt={...orderAttempt,phase:'failed'};
    snapshotValue=next;chemistry?.sync(next);resultUI?.update(next);if(message==='Unable to verify NEAR state. Retry.')message='';render();}
  catch(e){if(controller.signal.aborted)return;
    if(/account changed|select a NEAR mainnet account/.test(e.message)){leave();return;}
    snapshotValue=null;$('#near-pool').replaceChildren();$('#near-actions').replaceChildren();close();message='Unable to verify NEAR state. Retry.';render();}
  finally{reading=false;}
}
function accountMenu(){
  const s=snapshotValue;modal('Your balances','<p>NEAR mainnet · '+escape(expected)+'</p><p>Wallet USDC · <strong id="near-wallet-value">'+(walletUSDC===null?'Loading…':money(walletUSDC))+'</strong></p><p>Trading balance · '+(s?money(s.account?.balance??0):'—')+'</p>'+
    (!s?'':expected!==cfg.owner?'<p>Owner pilot · deposits and trades unavailable for this account</p>':btn('topup','Top up wallet')+btn(!s.account?'register':!s.exchangeRegistered?'storage_deposit':'ft_transfer_call','Load funds')+
      (s.pendingWithdrawal?'<p>Withdrawal pending · '+money(s.pendingWithdrawal)+'</p>':s.account?.balance?btn('withdraw','Withdraw'):''))
    +btn('trading-settings',tradingEnabled?'One-click trading · Manage':'Enable one-click trading')+btn('history','History')+btn('switch','Switch wallet')+btn('disconnect','Disconnect'));
}
const methods={
 register:['Register exchange account','0.1 NEAR non-refundable storage'],storage_deposit:['Register exchange for USDC','Storage deposit paid in NEAR'],
 ft_transfer_call:['Load USDC','Move wallet USDC into your trading balance.'],
 withdraw:['Withdraw USDC','Transfers from exchange balance to your wallet.'],add_liquidity:['Add liquidity','Allocate exchange USDC to the vault.'],
 request_remove:['Request removal','Queue all your LP shares.'],cancel_remove:['Cancel removal','Unlock your queued shares.'],
 process_remove:['Claim removal','Credits your exchange balance.'],request_close:['Close position','Request settlement within the displayed BTC price limits.'],
 request_open:['Open position','Margin $10 · entry fee $0.10 · execution escrow $0.14.'],cancel_open:['Cancel expired entry','Return unused margin to your exchange balance.']};
async function prepare(method,long){
  const s=snapshotValue;if(!s||s.owner!==cfg.owner||busy)throw Error('This action is unavailable.');
  const amount=['ft_transfer_call','withdraw','add_liquidity'].includes(method);
  const args={},receiver=['storage_deposit','ft_transfer_call'].includes(method)?cfg.token:cfg.exchange;
  let deposit='0';
  if(method==='register')deposit='100000000000000000000000';
  if(method==='storage_deposit'){deposit=s.storageMin;Object.assign(args,{account_id:cfg.exchange,registration_only:true});}
  if(method==='ft_transfer_call'){deposit='1';Object.assign(args,{receiver_id:cfg.exchange,msg:'deposit'});}
  if(method==='withdraw')deposit='1';
  if(method==='request_remove')args.shares=String(s.account.shares);
  if(['cancel_open','process_remove','request_close'].includes(method))args.owner=expected;
  if(method==='request_open'){if(entryBlock(s))throw Error(entryBlock(s));Object.assign(args,{owner:expected,long,margin:'10000000',leverage:500});}
  if(method==='request_close'||method==='request_open'){if(method==='request_open'&&!fresh(s))throw Error('Waiting for a verified BTC price.');if(method==='request_close'&&(!s.position?.entry||s.position.close&&s.height<=s.position.close.until))throw Error('No available position to close.');const price=method==='request_close'?exitReference(s,liveMarket):BigInt(s.engine.price);args.min_price=String(price*9970n/10000n);args.max_price=String(price*10030n/10000n);}
  const limit=method==='ft_transfer_call'?await depositLimit(s,controller.signal):null;
  if(method==='ft_transfer_call')await identity();
  if(limit===0n)throw Error('No USDC can be loaded at this time.');
  review={method,args,receiver,deposit,amount,max:amount?(limit??BigInt(s.account?.balance??0)):null,position:s.position?.id};
  if(tradingEnabled&&tradingMethods.includes(method)){review.oneClick=true;await sign();return;}
  modal(methods[method][0],'<p>'+methods[method][1]+'</p>'+(amount?'<p>'+(method==='ft_transfer_call'?'Available in wallet':'Available trading balance')+' · <strong>'+money(method==='ft_transfer_call'?s.wallet:s.account?.balance??0)+'</strong></p>'+(limit!==null?'<p>Maximum load · '+money(limit)+'</p>':'')+'<label>USDC amount <input id="near-amount" inputmode="decimal"></label>'+btn('amount-max','Max'):'')+(args.min_price?'<p>BTC bounds · '+money(args.min_price)+' – '+money(args.max_price)+'</p>':'')+'<p>Attached '+escape(deposit)+' yoctoNEAR · plus network gas</p>'+btn('sign','Confirm in Meteor'));
}
async function sign(){
  if(!review||busy)return;
  const tx=review,s=snapshotValue;if(tx.amount){const n=parseAmount($('#near-amount').value);if(n>(tx.method==='ft_transfer_call'?s.wallet:BigInt(s.account.balance)))throw Error('Amount exceeds available balance.');tx.args.amount=n.toString();}
  busy=true;if(['request_open','request_close'].includes(tx.method))orderAttempt={method:tx.method,phase:'checking',started:Date.now(),wallet:!tx.oneClick};close();render();const record={id:crypto.randomUUID(),method:tx.method,status:tx.oneClick?'Submitting trade':'Awaiting Meteor',position:tx.position};
  try{await identity();const latest=await snapshot(expected,controller.signal);
    if(tx.method==='request_open'){const h=await fetch('/api/near/status?owner='+encodeURIComponent(expected),{cache:'no-store',signal:controller.signal});if(!h.ok)throw Error('Keeper unavailable');latest.service=verifiedService(latest,await h.json());if(entryBlock(latest))throw Error(entryBlock(latest));}
    if(tx.amount&&tx.method!=='ft_transfer_call'&&BigInt(tx.args.amount)>BigInt(latest.account?.balance??0))throw Error('Balance changed. Review the available amount again.');
    if(tx.method==='ft_transfer_call'){
      const limit=await depositLimit(latest,controller.signal);
      if(BigInt(tx.args.amount)>limit)throw Error('Maximum you can load is '+money(limit)+'.');
    }
    if(tx.method!=='ft_transfer_call'&&latest.position?.id!==tx.position)throw Error('Position changed. Review again.');
    const sdk=await import(METEOR_MODULE_URL);await identity();
    if(orderAttempt){orderAttempt.phase='sending';renderOrderProgress();}
    writeRecord(record);record.submitted=true;const outcome=await sdk.signNear(expected,tx.receiver,tx.method,tx.args,tx.deposit,!!tx.oneClick);
    record.hash=outcome?.transaction?.hash;record.status='Confirmation unknown';
    if(outcome?.status?.Failure||outcome?.receipts_outcome?.some(x=>x.outcome.status?.Failure))record.status='Transaction failed';
    else if(outcome?.status&&Object.hasOwn(outcome.status,'SuccessValue')){
      record.status='Executed';if(tx.method==='ft_transfer_call'){const accepted=BigInt(JSON.parse(atob(outcome.status.SuccessValue)));record.status=accepted===0n?'Deposit refunded · '+money(tx.args.amount)+' returned to your wallet':'Loaded '+money(accepted)+' of '+money(tx.args.amount);}
    }
    if(orderAttempt)orderAttempt.phase=record.status==='Executed'?'accepted':record.status==='Transaction failed'?'failed':'unknown';
    if(tx.method==='cancel_open'&&record.status==='Executed'||tx.method==='request_open'&&record.status==='Transaction failed')chemistry?.cancel();
    writeRecord(record);await identity();message=record.status;
  }catch(e){if(tx.method==='request_open'&&(!record.submitted||/cancel|reject/i.test(e.message)))chemistry?.cancel();if(orderAttempt)orderAttempt.phase=!record.submitted||/cancel|reject/i.test(e.message)?'failed':'unknown';if(record.submitted){record.status='Check Meteor activity before retrying';writeRecord(record);}throw e;}
  finally{busy=false;await refresh();}
}
async function start(){
  const {selector}=await identity();accountConfirmed=true;
  subscription=selector.store.observable.subscribe(state=>{const active=state.accounts.find(a=>a.active)?.accountId;if(active&&active!==expected)leave();});
  root.dataset.owned='true';root.dataset.connected='true';initHeaderTagline(root);initBrandTheme(root);initDesktopLayout(root);initTradeHands(root);tidyFooter(root);
  const wordmark=$('.p-brandtext');
  const home=document.createElement('a');home.className=wordmark.className;home.href='/';home.setAttribute('aria-label','Yellowhands simulator');home.style.textDecoration='none';home.innerHTML=wordmark.innerHTML;wordmark.replaceWith(home);
  const style=document.createElement('style');style.textContent=CSS+FOCUS_CSS+LAYOUT_CSS+RESULT_CSS+NEAR_LAYOUT;document.head.append(style);
  const liveHero=$('#p-live-hero');
  liveHero.innerHTML='<div class="p-status" id="p-live-status"></div><div class="p-live-value p-mono" id="p-roi">—</div><div class="p-live-meta"><strong id="p-pnl">—</strong><span>·</span><span id="p-pnl-label">Live estimate · before fees</span><span>·</span><span id="p-your-margin">$10 margin</span></div><div id="p-pnl-reference" class="p-pnl-reference"></div>';
  $('.p-header').after(liveHero);
  resultUI=mountNearResult(root,'yellowhands:near:result:'+scope(expected));
  put('.p-demo','NEAR Beta · Unaudited');put('#p-connection','NEAR MAINNET');put('.p-v1-source','VERIFIED EXECUTION PRICE');put('#p-source-hint','NEAR mainnet');
  $('#p-chart-source').href='https://nearblocks.io/address/'+cfg.exchange;put('#p-chart-source','NEAR exchange ↗');put('#p-chart-time','Hyperliquid BTC · market chart');put('#p-chart-loading','Loading BTC market chart…');
  put('#p-cashout-value','');put('.p-cashout-label','EXIT');put('#p-your-margin','$10 margin');put('#p-pnl-label','Before fees');$('#p-live-hero').querySelectorAll('.p-live-meta span').forEach(e=>{if(e.id==='p-pnl-reference')e.textContent='NEAR';});
  $('#p-active-controls').replaceChildren($('.p-cashout'));$('#p-active-controls').insertAdjacentHTML('beforeend','<div class="near-order" role="status" aria-live="polite" hidden></div>');
  $('#p-entry-controls').innerHTML='<p>$10 margin · 500×</p><p>Entry requires $10.24 including $0.10 entry fee and $0.14 escrow.</p>';
  $('#p-ready-hero').innerHTML='<div class="near-tabs" role="group" aria-label="Dashboard view"><button data-near="trader">Trader</button><button data-near="lp">LP</button></div><p id="near-state" role="status"></p><div id="near-actions"></div><div class="near-order" role="status" aria-live="polite" hidden></div><button id="near-trading-permission" type="button" class="yh-link" data-near="trading-settings"></button>';
  $('.p-terminal').insertAdjacentHTML('afterbegin','<section id="near-pool" hidden></section>');
  chart=new LivePriceChart($('#p-tv-chart'),{mascot:'dot',focusedRange:true,focusWindowMs:30000});marketFeed=new BtcLiveFeed({onUpdate:market=>{
    if(controller.signal.aborted)return;
    liveMarket=market;chart.update(market);renderLivePnl();
    $('#p-chart-loading').hidden=Boolean(market.quote);
    put('#p-chart-time','Hyperliquid BTC · '+market.status);
  }});
  root.querySelectorAll('.near-order').forEach(node=>node.remove());
  const road=document.createElement('section');road.id='near-road';road.setAttribute('aria-label','Trade progress');road.innerHTML='<div id="near-road-bird"></div><div class="near-road-body"><div class="near-order" role="status" aria-live="polite"></div><ol aria-label="Execution steps"></ol></div>';
  $('.p-arena').prepend(road);road.querySelector('#near-road-bird').innerHTML='<svg viewBox="0 0 80 80" aria-hidden="true"><ellipse cx="37" cy="41" rx="25" ry="21" fill="#f0b90b"/><path d="M57 38l17 8-17 6" fill="#e69c25"/><ellipse cx="31" cy="46" rx="13" ry="9" fill="#d59d09"/><circle cx="49" cy="33" r="10" fill="#fff"/><circle cx="52" cy="33" r="4" fill="#181a20"/><path d="M25 22q-7-13 4-10M34 20q0-12 9-9" stroke="#f0b90b" stroke-width="4" fill="none" stroke-linecap="round"/></svg>';
  try{chemistry=nearChemistry(mountChemistryPanel($('.p-terminal'),{body:true}));}catch{}
  marketFeed.start();
  root.dataset.uiReady='true';document.querySelector('#yh-boot').hidden=true;render();await refresh();
}
root.addEventListener('click',async event=>{
  const b=event.target.closest('button');if(!b)return;
  const key=b.dataset.near||b.dataset.action;
  try{if(key?.startsWith('result-'))await resultUI.action(key);
    else if(key==='dismiss')close();
    else if(key==='switch'||key==='disconnect'){if(busy)return;await (await identity()).wallet.signOut();leave();}
    else if(key==='wallet'||key==='fund'||key==='connect')accountMenu();
    else if(key==='lp'||key==='trader'){mode=key;location.hash=key==='lp'?'liquidity':'';render();}
    else if(key==='history')modal('Your NEAR wallet activity',receiptLinks());
    else if(key==='topup'&&expected===cfg.owner)modal('Top up wallet','<p>Send native USDC on NEAR mainnet to</p><strong>'+escape(expected)+'</strong><p>Keep NEAR in your wallet for gas.</p>');
    else if(key==='trading-settings')modal('One-click trading',tradingEnabled?'<p>UP, DOWN and EXIT submit immediately. Deposits, withdrawals and liquidity changes still require wallet confirmation.</p><p>This permission has no automatic expiry or trading-loss budget. It can trade the funds loaded into this exchange.</p>'+btn('revoke-trading','Revoke in Meteor'):'<p>Approve once in Meteor. Then UP, DOWN and EXIT submit without another review.</p><p>Allows opening, closing and cancelling trades only. Cannot withdraw funds. Trades can lose your loaded balance; the gas allowance is not a trading budget. No automatic expiry.</p>'+btn('enable-trading','Approve in Meteor'));
    else if(key==='enable-trading'||key==='revoke-trading'){
      if(busy)return;busy=true;close();render();
      try{const sdk=await import(METEOR_MODULE_URL);await identity();
        if(key==='enable-trading'){
          const permission=await sdk.enableTrading(expected);
          if(permission?.pending){
            permissionPending={started:Date.now(),reloaded:true};sessionStorage.setItem(permissionPendingKey,JSON.stringify(permissionPending));
            message='Confirming approval…';render();location.reload();return;
          }
          permissionPending=null;sessionStorage.removeItem(permissionPendingKey);tradingEnabled=true;message='One-click trading enabled';
        }
        else{await sdk.revokeTrading(expected);tradingEnabled=false;message='Trading permission revoked';}
      }finally{busy=false;await refresh();}
    }
    else if(key==='amount-max'&&review?.amount){$('#near-amount').value=(Number(review.max)/1e6).toFixed(6).replace(/\.?0+$/,'');}
    else if(key==='sign')await sign();
    else if(b.dataset.enter){if(snapshotValue&&!busy&&!entryBlock(snapshotValue))chemistry?.start({isLong:b.dataset.enter==='up',entryPrice:liveMarket?.quote?.chartPrice??snapshotValue.engine.price/1e6,margin:10,leverage:500});try{await prepare('request_open',b.dataset.enter==='up');}catch(error){if(!orderAttempt||orderAttempt.phase==='failed')chemistry?.cancel();throw error;}}
    else if(key==='cashout')await prepare('request_close');
    else if(Object.hasOwn(methods,key))await prepare(key);
    else if(key==='details')modal('Trade details','<p>NEAR owner pilot · $10 margin · 500×. Signed requests require a newer verified price and keeper execution.</p>');
  }catch(e){modal('NEAR wallet',escape(e.message)+btn('dismiss','Close'));}
});
window.addEventListener('pagehide',()=>{chemistry?.destroy();controller.abort();marketFeed?.stop();subscription?.unsubscribe();root.hidden=true;});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
setInterval(()=>{if(!controller.signal.aborted&&!document.hidden){renderLivePnl();renderOrderProgress();const countdown=$('#near-removal-countdown');if(countdown){const left=Math.max(0,Number(countdown.dataset.ready)-Math.floor(Date.now()/1000));countdown.textContent=left?left+' seconds':'Window open · waiting for open trades to settle if any';}}},1000);
start().then(()=>setInterval(()=>{if(!document.hidden&&!busy)void refresh();},3500)).catch(()=>{if(!accountConfirmed){leave();return;}const boot=document.querySelector('#yh-boot');boot.textContent='Unable to load NEAR dashboard. Reload to retry.';boot.hidden=false;});
