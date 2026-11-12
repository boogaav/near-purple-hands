import {whiteCandleHand} from './brand-hands.mjs';

const hand=whiteCandleHand.replace('fill="#fff"','fill="currentColor"');
export function tradeHandMarkup(side){
  const up=side==='up';
  return '<span class="p-hand-art p-hand-art-'+(up?'left':'right')+'" aria-hidden="true">'+hand+'</span><span class="p-hand-label" aria-hidden="true"><span class="p-hand-title">'+(up?'UP':'DOWN')+'</span><span class="p-hand-arrow">'+(up?'↗':'↘')+'</span></span><span class="p-hand-sub" aria-hidden="true">'+(up?'BUY · OPEN LONG':'SELL · OPEN SHORT')+'</span>';
}

// Presentation only: native clicks flow to the existing order handler and its
// account, price-freshness and pending-order guards. No synthesized live orders.
export function initTradeHands(root){
  if(!root||root.dataset.tradeHands)return;
  const doc=root.ownerDocument,view=doc.defaultView;
  const originalSubmit=root.querySelector('#ph-submit');
  let buttons=[...root.querySelectorAll('button[data-enter]')];
  if(!buttons.length&&originalSubmit){
    const group=doc.createElement('div');group.className='ph-trade-hands';group.setAttribute('aria-label','Trade direction');
    buttons=['up','down'].map(side=>{const b=doc.createElement('button');b.dataset.handSide=side;group.append(b);return b;});
    originalSubmit.before(group);originalSubmit.hidden=true;
    const sidePicker=root.querySelector('.ph-side');if(sidePicker)sidePicker.hidden=true;
  }
  if(!buttons.length)return;
  root.dataset.tradeHands='true';
  if(!doc.getElementById('ph-trade-hands-style')){const style=doc.createElement('style');style.id='ph-trade-hands-style';style.textContent=HAND_CSS;doc.head.append(style);}
  buttons.forEach(button=>{
    const side=button.dataset.enter||button.dataset.handSide;
    button.type='button';button.classList.add('ph-trade-hand');button.dataset.handSide=side;
    button.setAttribute('aria-label',side==='up'?'UP — buy / open long':'DOWN — sell / open short');
    button.innerHTML=tradeHandMarkup(side);
    button.addEventListener('keydown',event=>{
      if(event.repeat&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.stopImmediatePropagation();}
    });
    // The retained order-ticket demo still reviews the order before submission.
    if(originalSubmit){
      button.addEventListener('click',()=>{
        if(button.disabled||originalSubmit.disabled||button.closest('[inert]'))return;
        root.querySelector('[data-side="'+(side==='up'?'long':'short')+'"]').click();originalSubmit.click();
      });
      const update=()=>{button.disabled=originalSubmit.disabled;};
      new view.MutationObserver(update).observe(originalSubmit,{attributes:true,attributeFilter:['disabled']});update();
    }
  });
}

export const HAND_CSS=`
html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand{--hand-direction:#0ecb81;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;position:relative;width:100%;height:208px;min-height:0;min-width:0;padding:18px 8px;border:1px solid var(--p-line,var(--ph-line));border-radius:20px;background:var(--p-surface,var(--ph-panel));box-shadow:none;text-align:center;touch-action:manipulation;user-select:none;cursor:pointer;color:var(--p-ink,var(--ph-text));transition:background .16s,border-color .16s,transform .16s}
html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand[data-hand-side=down]{--hand-direction:#f6465d}
html #purple-hands-play[data-trade-hands=true] .p-wing{mix-blend-mode:normal}
html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand .p-hand-art{display:block;position:relative;width:65px;height:92px;aspect-ratio:auto;flex-shrink:0;margin:0 0 3px;overflow:visible;mix-blend-mode:normal;transform:rotate(-8deg);color:var(--p-purple,var(--ph-violet));pointer-events:none;transition:transform .16s}
html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand .p-hand-art-right{transform:rotate(8deg)}
.ph-trade-hand .p-hand-art svg{display:block;width:100%;height:100%;pointer-events:none}
.ph-trade-hand .p-hand-art-right svg{transform:scaleX(-1)}
html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand .p-hand-label{display:flex;align-items:center;align-self:center;gap:6px;margin:0;color:var(--hand-direction)}
html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand .p-hand-title{font-size:27px;font-weight:750;letter-spacing:-.7px;line-height:1}
html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand .p-hand-arrow{font-size:21px;line-height:1}
html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand .p-hand-sub{align-self:center;margin:0;color:var(--p-dim,var(--ph-muted));font-size:9px;letter-spacing:.3px;line-height:1.4;white-space:normal}
html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand:hover:not(:disabled){filter:none;background:color-mix(in srgb,var(--hand-direction) 5%,var(--p-surface,var(--ph-panel)));border-color:color-mix(in srgb,var(--hand-direction) 65%,transparent)}
html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand:focus-visible{outline:2px solid var(--p-purple,var(--ph-violet));outline-offset:3px}
html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand:active:not(:disabled){transform:scale(.98)}
html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand:disabled{cursor:default;opacity:1}
html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand:disabled :is(.p-hand-art,.p-hand-label){opacity:.45}
html #purple-hands-play[data-trade-hands=true][data-clapping=true] .ph-trade-hand:disabled .p-hand-art{opacity:1}
html #purple-hands[data-trade-hands=true] .ph-trade-hands{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
html #purple-hands-play[data-trade-hands=true] .p-entry-buttons{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
@media(min-width:900px) and (max-height:800px){html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand{height:176px;padding:14px 6px;gap:7px}html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand .p-hand-art{width:51px;height:72px}}
@media(max-width:899px){html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand{height:176px;padding:14px 8px;gap:7px}html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand .p-hand-art{width:51px;height:72px}html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand .p-hand-title{font-size:25px}}
@media(prefers-reduced-motion:reduce){html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand,html :is(#purple-hands-play,#purple-hands)[data-trade-hands=true] .ph-trade-hand .p-hand-art{transition:none}}
`;
