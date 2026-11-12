const money=n=>'$'+(Number(n)/1e6).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:6});
const signed=n=>(n>0n?'+':n<0n?'−':'')+money(n<0n?-n:n);
export function feeRows(result){
 const a=result.receipt.args,p=result.position;
 return [
  ['Entry fee',money(BigInt(p.entryFee))],
  ['Skew premium',money(BigInt(p.skewPremium||0))],
  ['Consumed escrow · execution fees',money(BigInt(result.receipt.escrowPaid))],
  [BigInt(a.grossPnl||0)<0n?'Protocol rake · included in trading loss':'Profit rake',money(BigInt(a.fee))],
  ['Early-exit fee',result.receipt.earlyExitFee==null?'Unavailable':money(BigInt(result.receipt.earlyExitFee))],
  ['Unused escrow returned',money(BigInt(result.receipt.escrowRefund))],
  ['Network gas','Excluded · paid separately'],
 ];
}
export function mountResult(root){
 const panel=root.querySelector('#p-result'),actions=panel.querySelector('.p-result-actions');
 actions.querySelector('[data-action=back]').textContent='← Back to trading';
 actions.querySelector('[data-action=share]').textContent='Share ↗';
 actions.querySelector('[data-action=receipt]').textContent='Receipt ↗';
 const close=document.createElement('button');close.className='yh-result-close';close.dataset.action='back';close.textContent='×';close.setAttribute('aria-label','Close result and return home');close.title='Close result and return home';actions.append(close);panel.prepend(actions);
 const receipt=actions.querySelector('[data-action=receipt]');
 const login=document.createElement('button');login.className='p-back';login.dataset.action='wallet';login.textContent='Sign in for real trades ↗';actions.insertBefore(login,close);
 const returnLabel=panel.querySelector('#p-result-return').previousElementSibling;
 const description=panel.querySelector('#p-result-description');
 const detail=document.createElement('details');detail.className='yh-result-fees';detail.innerHTML='<summary aria-label="Fees and execution details" title="Fees and execution details">?</summary><div class="yh-result-fee-body"><h3>Fees & execution</h3><dl></dl></div>';
 description.before(detail);detail.querySelector('.yh-result-fee-body').append(description);
 return (result,quote)=>{
  login.hidden=!result.demo;receipt.hidden=!!result.demo;detail.hidden=!!result.demo;
  returnLabel.textContent=result.demo?'Simulated return':'Net settlement';
  if(result.demo)return;
  detail.open=false;const list=detail.querySelector('dl');list.replaceChildren();
  for(const [label,value] of feeRows(result)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;list.append(dt,dd);}
  description.textContent='Net result includes the charges above. Rake on a losing trade is allocated from the loss, not charged again.'+(quote?' At your exit click: '+signed(quote.net)+' estimated; execution difference: '+signed(result.net-quote.net)+'.':'')+' Network gas excluded.';
 };
}
export const RESULT_CSS=`
#purple-hands-play[data-owned=true] #p-result{align-self:stretch;justify-content:flex-start;max-width:none;position:relative;min-height:0;overflow-y:auto;padding:0 8px 20px;box-sizing:border-box;display:block}
#purple-hands-play[data-owned=true] #p-result[hidden]{display:none!important}
#purple-hands-play[data-owned=true] #p-result .p-result-actions{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;gap:8px;padding:10px 0 14px;background:var(--p-surface,#202329);margin:0 0 16px;justify-content:center}
#purple-hands-play[data-owned=true] #p-result .p-result-actions button{min-height:44px;padding:10px 16px;font-size:13px;border-radius:12px;white-space:nowrap}
#purple-hands-play[data-owned=true] #p-result .p-back{min-width:0}
#purple-hands-play[data-owned=true] #p-result .yh-result-close{margin-left:auto;width:44px;padding:0;font-size:26px;background:var(--p-raised);color:var(--p-ink);border:1px solid var(--p-line)}
#purple-hands-play[data-owned=true] #p-result-symbol{width:100px;height:72px;margin:8px auto}
#purple-hands-play[data-owned=true] #p-result h1{font-size:clamp(28px,3vw,42px)}
#purple-hands-play[data-owned=true] #p-result .p-result-value{font-size:clamp(48px,5vw,72px)}
#purple-hands-play[data-owned=true] .yh-result-fees{max-width:520px;margin:10px auto}
#purple-hands-play[data-owned=true] .yh-result-fees summary{list-style:none;display:grid;place-items:center;width:36px;height:36px;margin:auto;border:1px solid var(--p-line);border-radius:50%;color:var(--p-purple);font-weight:700;cursor:pointer}
#purple-hands-play[data-owned=true] .yh-result-fees summary::-webkit-details-marker{display:none}
#purple-hands-play[data-owned=true] .yh-result-fees summary:focus-visible{outline:2px solid var(--p-purple);outline-offset:3px}
#purple-hands-play[data-owned=true] .yh-result-fee-body{margin-top:12px;padding:16px;border:1px solid var(--p-line);border-radius:14px;text-align:left;background:var(--p-surface)}
#purple-hands-play[data-owned=true] .yh-result-fee-body h3{font-size:15px;margin:0 0 12px}
#purple-hands-play[data-owned=true] .yh-result-fee-body dl{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;font-size:12px;line-height:1.5}
#purple-hands-play[data-owned=true] .yh-result-fee-body dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}
#purple-hands-play[data-owned=true] #p-result .p-receipt{margin:16px auto}
@media(max-width:500px){#purple-hands-play[data-owned=true] #p-result .p-result-actions button{padding:8px;font-size:11px}#purple-hands-play[data-owned=true] #p-result .p-result-actions{gap:5px}}
`;
