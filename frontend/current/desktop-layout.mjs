// Move the existing controls at the desktop breakpoint. Never clone inputs or
// recreate the chart: selected settings, event handlers and live state survive.
export function initDesktopLayout(root) {
  if(!root)return;
  const doc=root.ownerDocument, view=doc.defaultView;
  if(!doc.getElementById('ph-desktop-layout')){
    const style=doc.createElement('style');style.id='ph-desktop-layout';style.textContent=DESKTOP_CSS;doc.head.append(style);
  }
  if(root.id!=='purple-hands-play')return;
  let stage=root.querySelector('.p-stage');
  // The retained one-tap demo predates the terminal wrappers.
  if(!stage){
    root.dataset.desktopLegacy='true';
    stage=doc.createElement('div');stage.className='p-stage';
    const terminal=doc.createElement('div');terminal.className='p-terminal';
    root.querySelector('.p-arena').append(stage);stage.append(terminal);
    ['.p-marketbar','#p-trading','#p-result'].forEach(selector=>{const el=root.querySelector(selector);if(el)terminal.append(el);});
  }
  const marketPanel=stage.querySelector('.p-terminal');marketPanel.setAttribute('role','region');marketPanel.setAttribute('aria-label','Market and trade status');
  const panel=doc.createElement('aside');panel.className='p-control-panel';panel.setAttribute('aria-label','Trade controls');panel.hidden=true;
  panel.innerHTML='<div class="p-control-heading"><span>TRADE CONTROLS</span><h2 class="p-control-ready">Make your move.</h2><h2 class="p-control-active">Own the exit.</h2><h2 class="p-control-ended">Trade complete.</h2></div><p class="p-control-settled">Your result is on the left. Review it, share it, or start your next trade.</p>';
  stage.append(panel);
  const slots=['#p-ready-hero','#p-entry-controls','.p-hands','#p-active-controls','#p-execution'].map(selector=>{
    const element=root.querySelector(selector);if(!element)return null;
    const anchor=doc.createComment('desktop control slot');element.before(anchor);return {element,anchor};
  }).filter(Boolean);
  const media=view.matchMedia('(min-width:900px)');
  let handsFirst=false;
  const arrange=()=>{
    const focus=doc.activeElement;
    if(media.matches){slots.forEach(({element})=>panel.append(element));panel.hidden=false;root.dataset.desktopSplit='true';}
    else{slots.forEach(({element,anchor})=>anchor.after(element));panel.hidden=true;delete root.dataset.desktopSplit;}
    if(handsFirst){
      const hands=root.querySelector('.p-hands'),hero=root.querySelector('#p-ready-hero'),settings=root.querySelector('#p-entry-controls');
      // Move the real buttons so keyboard order follows the visual order. On
      // mobile, keep this compact control group below the market chart.
      if(hands&&hero&&settings){
        if(media.matches)panel.prepend(hands);else settings.before(hands);
        hands.after(hero);
      }
    }
    if(focus!==doc.activeElement&&focus?.isConnected&&root.contains(focus))focus.focus({preventScroll:true});
    // Standalone SVG demos redraw on resize; the live canvas observes its host.
    view.requestAnimationFrame(()=>view.dispatchEvent(new Event('resize')));
  };
  media.addEventListener('change',arrange);arrange();
  const cleanup=()=>{media.removeEventListener('change',arrange);slots.forEach(({element,anchor})=>{anchor.after(element);anchor.remove();});panel.remove();delete root.dataset.desktopSplit;};
  cleanup.setHandsFirst=value=>{value=!!value;if(value===handsFirst)return;handsFirst=value;arrange();};
  return cleanup;
}

export const DESKTOP_CSS=`
@media(min-width:900px){
 #purple-hands-play[data-desktop-split=true][data-desktop-legacy=true]{height:calc(100dvh - 16px);min-height:640px;display:grid;grid-template-rows:auto minmax(0,1fr) 32px}
 #purple-hands-play[data-desktop-split=true][data-desktop-legacy=true] .p-arena{min-height:0;padding:18px}
 #purple-hands-play[data-desktop-split=true][data-desktop-legacy=true] .p-terminal{background:var(--p-surface);border:1px solid var(--p-line);border-radius:24px}
 #purple-hands-play[data-desktop-split=true] .p-stage{display:grid;grid-template-columns:minmax(0,1fr) clamp(290px,27vw,360px);grid-template-rows:minmax(0,1fr);gap:14px;align-items:stretch;max-width:1680px;height:100%;min-height:0}
 #purple-hands-play[data-desktop-split=true] .p-control-panel{display:flex;flex-direction:column;position:relative;min-width:0;min-height:0;padding:24px;border:1px solid #b99aff35;border-radius:24px;background:linear-gradient(155deg,#33205c,#271747);overflow-y:auto;scrollbar-width:thin;scrollbar-color:#bd9aff44 transparent}
 #purple-hands-play[data-desktop-split=true] .p-control-panel>*{flex-shrink:0}
 #purple-hands-play[data-desktop-split=true] .p-control-heading{margin-bottom:20px}
 #purple-hands-play[data-desktop-split=true] .p-control-heading>span{display:block;color:var(--p-purple);font-size:9px;font-weight:650;letter-spacing:1.5px;margin-bottom:8px}
 #purple-hands-play[data-desktop-split=true] .p-control-heading h2{font-size:26px;line-height:1.15;letter-spacing:-.9px;font-weight:700}
 #purple-hands-play[data-desktop-split=true] :is(.p-control-active,.p-control-ended,.p-control-settled){display:none}
 #purple-hands-play[data-desktop-split=true] #p-ready-hero{padding:0;min-height:0;align-items:stretch;text-align:left;margin-bottom:24px}
 #purple-hands-play[data-desktop-split=true] #p-ready-hero .p-subtitle{display:flex;flex-direction:column;align-items:stretch;gap:12px;margin:0;font-size:11px;line-height:1.5}
 #purple-hands-play[data-desktop-split=true] #p-ready-hero :is(.p-status,.p-headline){display:none}
 #purple-hands-play[data-desktop-split=true] .p-inline-connect{margin:0;min-height:42px;border-radius:10px;font-size:10px}
 #purple-hands-play[data-desktop-split=true] .p-controls{width:100%;max-width:none;margin:0}
 #purple-hands-play[data-desktop-split=true] .p-trade-settings{grid-template-columns:1fr;gap:20px}
 #purple-hands-play[data-desktop-split=true] .p-setting-group legend{font-size:11px;margin-bottom:9px}
 #purple-hands-play[data-desktop-split=true] .p-setting-group .p-amounts button{min-height:44px;font-size:13px}
 #purple-hands-play[data-desktop-split=true] .p-entry-note{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;font-size:11px;margin:18px 0 0;line-height:1.4}
 #purple-hands-play[data-desktop-split=true] .p-setting-divider{display:none}
 #purple-hands-play[data-desktop-split=true] .p-error{text-align:left;font-size:10px;line-height:1.5;margin-top:9px}
 #purple-hands-play[data-desktop-split=true] .p-hands{position:relative;left:auto;bottom:auto;transform:none;display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:none;width:100%;margin: auto 0 0;padding-top:22px;flex-shrink:0;visibility:visible}
 #purple-hands-play[data-desktop-split=true] .p-hand-button{display:flex;flex-direction:column;align-items:center;justify-content:center;height:152px;min-height:0;padding:12px 5px;gap:6px;border-radius:16px;text-align:center}
 #purple-hands-play[data-desktop-split=true] .p-hand-art{width:48px;flex-shrink:0}
 #purple-hands-play[data-desktop-split=true] .p-hand-label{align-self:center;gap:6px;margin:0}
 #purple-hands-play[data-desktop-split=true] .p-hand-title{font-size:24px}
 #purple-hands-play[data-desktop-split=true] .p-hand-arrow{font-size:19px}
 #purple-hands-play[data-desktop-split=true] .p-hand-sub{align-self:center;font-size:8px;letter-spacing:.4px;margin:0}
 #purple-hands-play[data-desktop-split=true] .p-active-controls{max-width:none;width:100%;margin:auto 0 0;padding-top:24px}
 #purple-hands-play[data-desktop-split=true] .p-buffer-row{font-size:10px;gap:8px;line-height:1.5}
 #purple-hands-play[data-desktop-split=true] .p-buffer{margin:8px 0 16px}
 #purple-hands-play[data-desktop-split=true] .p-cashout{min-height:56px;padding:14px;font-size:16px}
 #purple-hands-play[data-desktop-split=true] .p-cashout-label{font-size:18px}
 #purple-hands-play[data-desktop-split=true] .p-active-note{font-size:10px;line-height:1.6;text-align:left;margin-top:12px}
 #purple-hands-play[data-desktop-split=true] .p-terminal{display:grid;grid-template-rows:42px 22px minmax(0,1fr);gap:8px;padding:20px;min-height:0;overflow:hidden}
 #purple-hands-play[data-desktop-split=true] .p-marketbar{flex-wrap:wrap;margin:0;width:100%;grid-row:1}
 #purple-hands-play[data-desktop-split=true] .p-sourcebar{grid-row:2}
 #purple-hands-play[data-desktop-split=true] :is(#p-trading,#p-result){grid-row:3}
 #purple-hands-play[data-desktop-split=true] .p-trading,#purple-hands-play[data-desktop-split=true] #p-trading{display:flex;flex-direction:column;min-height:0;gap:10px}
 #purple-hands-play[data-desktop-split=true] .p-chart-container{height:auto;min-height:140px;flex:1;margin:0;width:100%}
 #purple-hands-play[data-desktop-split=true] .p-chart-foot{flex-shrink:0;margin:0;min-height:20px}
 #purple-hands-play[data-desktop-split=true] #p-live-hero{min-height:0;flex-shrink:0;padding:14px 0 20px}
 #purple-hands-play[data-desktop-split=true] .p-live-value{font-size:48px;line-height:1.05;margin:0 0 8px}
 #purple-hands-play[data-desktop-split=true] .p-result{min-height:0;padding:12px 0;overflow-y:auto}
 #purple-hands-play[data-desktop-split=true] .p-result-actions{flex-wrap:wrap;justify-content:center}
 #purple-hands-play[data-desktop-split=true] .p-execution{bottom:160px;max-width:calc(100% - 24px);font-size:9px}
 #purple-hands-play[data-desktop-split=true][data-phase=active] .p-entry-note{display:flex}
 #purple-hands-play[data-desktop-split=true][data-phase=active] .p-control-ready{display:none}
 #purple-hands-play[data-desktop-split=true][data-phase=active] .p-control-active{display:block}
 #purple-hands-play[data-desktop-split=true][data-phase=active] .p-hands{position:absolute;bottom:12px;left:24px;width:calc(100% - 48px);padding:0;margin:0;visibility:hidden;pointer-events:none}
 #purple-hands-play[data-desktop-split=true][data-phase=active][data-clapping=true] .p-hand-art{visibility:visible}
 #purple-hands-play[data-desktop-split=true]:is([data-phase=win],[data-phase=loss],[data-phase=liquidated]) :is(.p-control-ready,#p-ready-hero,#p-entry-controls,.p-hands){display:none}
 #purple-hands-play[data-desktop-split=true]:is([data-phase=win],[data-phase=loss],[data-phase=liquidated]) :is(.p-control-ended,.p-control-settled){display:block}
 #purple-hands-play[data-desktop-split=true] .p-control-settled{color:var(--p-dim);font-size:13px;line-height:1.7;max-width:240px}
 html[data-brand-theme=yellow] #purple-hands-play[data-desktop-split=true] .p-control-panel{background:linear-gradient(155deg,#252930,#1e2026);border-color:#f0b90b30}
 /* The older terminal preview uses an order ticket beside the market chart. */
 html #purple-hands .ph-trade-grid{grid-template-columns:minmax(0,1fr) minmax(290px,340px)}
 html #purple-hands .ph-trade-grid>div:first-child{grid-column:1;grid-row:1;min-width:0}
 html #purple-hands .ph-trade-grid>.ph-ticket{grid-column:2;grid-row:1}
}
@media(min-width:900px) and (max-height:800px){
 #purple-hands-play[data-desktop-split=true] .p-control-panel{padding:18px}
 #purple-hands-play[data-desktop-split=true] .p-control-heading{margin-bottom:12px}
 #purple-hands-play[data-desktop-split=true] .p-control-heading h2{font-size:23px}
 #purple-hands-play[data-desktop-split=true] .p-control-heading>span{margin-bottom:6px}
 #purple-hands-play[data-desktop-split=true] .p-ready-copy{display:none}
 #purple-hands-play[data-desktop-split=true] #p-ready-hero{margin-bottom:14px}
 #purple-hands-play[data-desktop-split=true] .p-trade-settings{gap:12px}
 #purple-hands-play[data-desktop-split=true] .p-entry-note{margin-top:12px}
 #purple-hands-play[data-desktop-split=true] .p-hands{padding-top:16px}
 #purple-hands-play[data-desktop-split=true] .p-hand-button{height:104px;gap:3px}
 #purple-hands-play[data-desktop-split=true] .p-hand-art{width:29px}
 #purple-hands-play[data-desktop-split=true] .p-hand-title{font-size:21px}
 #purple-hands-play[data-desktop-split=true][data-phase=active] .p-hands{left:18px;width:calc(100% - 36px)}
 #purple-hands-play[data-desktop-split=true] .p-execution{bottom:130px}
 #purple-hands-play[data-desktop-split=true] #p-live-hero{padding:4px 0 12px}
 #purple-hands-play[data-desktop-split=true] .p-live-value{font-size:38px}
}
`;
