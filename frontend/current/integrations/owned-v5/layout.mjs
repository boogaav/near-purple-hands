export function tidyFooter(root){
 const footer=root.querySelector('.p-footer');
 const nav=document.createElement('nav');nav.className='yh-footer-nav';nav.setAttribute('aria-label','Footer navigation');
 for(const selector of ['a[href="/privacy"]','button[data-action="details"]','button[data-action="history"]','a[data-support]']){const item=footer.querySelector(selector);if(item)nav.append(item);}
 const chemistry=document.createElement('a');chemistry.href='/chemistry';chemistry.textContent='Chemistry';nav.append(chemistry);
 const status=footer.querySelector('#p-connection');footer.replaceChildren();if(status)footer.append(status);footer.append(nav);
}
export const LAYOUT_CSS=`
html #purple-hands-play[data-owned=true] .p-footer{height:auto;min-height:48px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px clamp(12px,2vw,28px);box-sizing:border-box;flex-wrap:wrap}
html #purple-hands-play[data-owned=true] #p-connection{font-size:10px;letter-spacing:.6px;white-space:nowrap;color:var(--p-dim)}
html #purple-hands-play[data-owned=true] .yh-footer-nav{display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap}
html #purple-hands-play[data-owned=true] .yh-footer-nav :is(a,button){display:inline-flex;align-items:center;justify-content:center;min-height:40px;min-width:40px;padding:8px 12px;box-sizing:border-box;border:0;border-radius:8px;background:transparent;font:inherit;font-size:12px;line-height:1.2;text-decoration:none;color:var(--p-dim);cursor:pointer}
html #purple-hands-play[data-owned=true] .yh-footer-nav :is(a,button):hover{color:var(--p-ink);background:var(--p-raised)}
html #purple-hands-play[data-owned=true] .yh-footer-nav :is(a,button):focus-visible{outline:2px solid var(--p-purple);outline-offset:2px}
html #purple-hands-play[data-owned=true] .p-dialog{max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);overflow-y:auto;box-sizing:border-box}
@media(min-width:900px){
 html #purple-hands-play[data-owned=true][data-header-tagline=true]{height:100dvh;min-height:480px;grid-template-rows:auto minmax(0,1fr) auto}
 html #purple-hands-play[data-owned=true] .p-header{padding:clamp(6px,1.2vh,14px) clamp(14px,2vw,32px);min-height:0;column-gap:14px}
 html #purple-hands-play[data-owned=true] .p-wallet{padding:8px 14px;min-height:52px}
 html #purple-hands-play[data-owned=true] #p-balance{font-size:clamp(24px,4vh,48px);line-height:1.1}
 html #purple-hands-play[data-owned=true] .p-arena{padding:clamp(8px,1.5vh,18px);gap:8px;min-height:0}
 html #purple-hands-play[data-owned=true] .p-control-panel{padding:clamp(12px,2vh,24px)}
 html #purple-hands-play[data-owned=true][data-trade-hands=true] .ph-trade-hand{height:clamp(120px,25dvh,280px);min-height:120px;gap:8px;padding:12px 8px}
 html #purple-hands-play[data-owned=true][data-trade-hands=true] .ph-trade-hand .p-hand-art{height:clamp(56px,12dvh,130px);width:auto}
 html #purple-hands-play[data-owned=true] .p-terminal{padding:clamp(10px,1.5vh,20px)}
}
html #purple-hands-play[data-owned=true][data-trade-focus=true]{height:100vh;height:100dvh;min-height:0;box-sizing:border-box}
html #purple-hands-play[data-owned=true][data-trade-focus=true] #yh-trader-panel{max-width:none;width:100%}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-terminal{padding-inline:0}
html #purple-hands-play[data-owned=true][data-trade-focus=true] #p-active-controls{max-width:640px;width:min(100%,640px)}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-chart-container{flex:1 1 0;height:auto;min-height:0;min-width:0}
html #purple-hands-play[data-owned=true][data-trade-focus=true] #p-active-controls{position:relative;z-index:5;background:var(--p-bg,#181b20);padding:8px 8px max(8px,env(safe-area-inset-bottom));box-sizing:border-box}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout{min-height:60px;padding:10px 16px}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout-label{font-size:clamp(24px,4vh,32px)}
@media(max-width:899px){
 html #purple-hands-play[data-owned=true]{height:auto;min-height:100dvh;overflow:visible}
 html #purple-hands-play[data-owned=true] .p-arena{padding:10px 12px;min-width:0}
 html #purple-hands-play[data-owned=true] .p-footer{justify-content:center;gap:0;padding-bottom:max(4px,env(safe-area-inset-bottom))}
 html #purple-hands-play[data-owned=true] #p-connection{display:none}
 html #purple-hands-play[data-owned=true] .p-chart-container{height:clamp(160px,30dvh,320px);min-height:160px}
 html #purple-hands-play[data-owned=true][data-trade-hands=true] .ph-trade-hand{height:clamp(112px,20dvh,190px);min-height:112px;padding:10px 6px;gap:6px}
 html #purple-hands-play[data-owned=true][data-trade-hands=true] .ph-trade-hand .p-hand-art{height:clamp(48px,8dvh,85px);width:auto}
 html #purple-hands-play[data-owned=true] .p-header{column-gap:8px}
 html #purple-hands-play[data-owned=true] .p-brandtext{font-size:16px}
}

html #purple-hands-play[data-owned=true][data-trade-focus=true]{position:relative;overflow:visible}
html #purple-hands-play[data-owned=true][data-trade-focus=true] > .ph-analytics-choice{position:absolute;inset:100% 0 auto;margin:0}
/* Reserve room for the position and exit first. The plot takes the remaining height. */
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-arena{display:flex;flex-direction:column;min-height:0;box-sizing:border-box}
html #purple-hands-play[data-owned=true][data-trade-focus=true] :is(#yh-trader-panel,.p-terminal,#p-trading){flex:1 1 0;min-height:0;height:auto}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .yh-workspace-bar,html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-header,html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-footer{flex:none}
html #purple-hands-play[data-owned=true][data-trade-focus=true] #p-active-controls{max-height:34dvh;overflow-y:auto;align-content:start}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout{position:sticky;top:0;z-index:1;align-self:start}
@media(max-height:650px){
 html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-footer,html #purple-hands-play[data-owned=true][data-trade-focus=true] .yh-workspace-bar{display:none}
 html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-header{min-height:0;padding-block:2px}
 html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-arena{padding-block:2px}
}
@media(max-height:480px){
 html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-header,html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-pool-caption,html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-chart-gesture-hint{display:none}
 html #purple-hands-play[data-owned=true][data-trade-focus=true] #p-live-hero .p-live-value{font-size:28px}
 html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout{min-height:46px;padding-block:5px}
}
/* A settled trade is a complete page, not a clipped row in the trading grid. */
html #purple-hands-play[data-owned=true][data-result-view=true]{display:flex;flex-direction:column;height:auto;min-height:100dvh;overflow:visible}
html #purple-hands-play[data-owned=true][data-result-view=true] .p-arena{flex:1;display:flex;flex-direction:column;justify-content:flex-start;height:auto;overflow:visible;min-height:0}
html #purple-hands-play[data-owned=true][data-result-view=true] #yh-trader-panel{display:block;width:100%;max-width:880px;height:auto;min-height:0;margin-inline:auto;overflow:visible}
html #purple-hands-play[data-owned=true][data-result-view=true] .p-terminal{display:block;height:auto;min-height:0;overflow:visible;padding:clamp(12px,2vw,24px)}
html #purple-hands-play[data-owned=true][data-result-view=true] :is(.p-control-panel,.p-marketbar,.p-sourcebar,.yh-tx,.p-hands){display:none}
html #purple-hands-play[data-owned=true][data-result-view=true] #p-result{height:auto;max-height:none;min-height:0;overflow:visible;width:100%;margin:0;padding:0;text-align:center}
html #purple-hands-play[data-owned=true][data-result-view=true] #p-result .p-result-actions{position:static;margin:0 0 8px;padding:0 0 8px;justify-content:center}
html #purple-hands-play[data-owned=true][data-result-view=true] #p-result .yh-result-close{margin-left:0}
html #purple-hands-play[data-owned=true][data-result-view=true] #p-result :is(h1,.p-result-value,.p-result-description){text-align:center;margin-inline:auto}
html #purple-hands-play[data-owned=true][data-result-view=true] #p-result-symbol{width:clamp(56px,9vh,90px);height:clamp(40px,7vh,64px);margin:4px auto}
html #purple-hands-play[data-owned=true][data-result-view=true] #p-result h1{margin:8px 0;font-size:clamp(26px,4vh,40px);line-height:1.1}
html #purple-hands-play[data-owned=true][data-result-view=true] .p-result-value{font-size:clamp(40px,7vh,68px);line-height:1.15;overflow-wrap:anywhere;margin:8px 0}
html #purple-hands-play[data-owned=true][data-result-view=true] .p-receipt{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;margin:8px auto}
html #purple-hands-play[data-owned=true][data-result-view=true] .yh-result-fee-body{overflow-wrap:anywhere}
@media(max-width:480px){
 html #purple-hands-play[data-owned=true][data-result-view=true] #p-result .p-result-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 44px}
 html #purple-hands-play[data-owned=true][data-result-view=true] #p-result .p-back[data-action=back]{grid-column:1/3;grid-row:1}
 html #purple-hands-play[data-owned=true][data-result-view=true] #p-result [data-action=wallet]{grid-column:1/-1;grid-row:3}
 html #purple-hands-play[data-owned=true][data-result-view=true] #p-result .yh-result-close{grid-column:3;grid-row:1;margin:0}
 html #purple-hands-play[data-owned=true][data-result-view=true] #p-result .p-result-actions button{white-space:normal;width:100%;min-width:0}
}

/* Compact workspace navigation travels with the currently visible controls. */
html #purple-hands-play[data-owned=true] .yh-workspace-bar{gap:8px;justify-content:flex-start;margin:0 0 10px;max-width:100%}
html #purple-hands-play[data-owned=true] .yh-workspace-tabs{padding:2px;gap:2px;border-radius:9px}
html #purple-hands-play[data-owned=true] .yh-workspace-tabs button{min-width:54px;min-height:28px;padding:4px 10px;font-size:11px;border-radius:6px}
html #purple-hands-play[data-owned=true] .yh-role-help summary{width:28px;height:28px;font-size:14px}
html #purple-hands-play[data-owned=true] #yh-liquidity>.yh-workspace-bar{flex:none}
html #purple-hands-play[data-owned=true][data-phase=ready] .p-sourcebar{display:none}
html #purple-hands-play[data-owned=true][data-phase=ready] .p-terminal{grid-template-rows:42px 24px minmax(0,1fr);gap:4px}
html #purple-hands-play[data-owned=true][data-phase=ready] .yh-tx{grid-row:2;min-height:20px;font-size:10px}
html #purple-hands-play[data-owned=true][data-phase=ready] #p-trading{grid-row:3;min-height:0;gap:4px}
html #purple-hands-play[data-owned=true][data-phase=ready] .p-marketbar{margin:0;width:100%;min-height:0}
html #purple-hands-play[data-owned=true][data-phase=ready] .p-chart-foot{margin:0;font-size:9px;min-height:14px}
@media(min-width:900px){
 html #purple-hands-play[data-owned=true][data-phase=ready] .p-chart-container{height:auto;min-height:200px;flex:1;margin:0}
 html #purple-hands-play[data-owned=true][data-phase=ready] #p-trading{display:flex;flex-direction:column;height:100%}
 html #purple-hands-play[data-owned=true][data-phase=ready] .p-terminal{padding:12px}
}
@media(max-width:899px){
 html #purple-hands-play[data-owned=true][data-phase=ready] .p-chart-container{height:48dvh;min-height:250px}
 html #purple-hands-play[data-owned=true] .yh-workspace-tabs button{min-height:36px}
 html #purple-hands-play[data-owned=true] .yh-role-help summary{width:36px;height:36px}
}
html #purple-hands-play .yh-beta-disclosure{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--p-line);border-radius:10px;background:var(--p-surface);color:var(--p-dim);padding:8px 10px;font:inherit;font-size:11px;line-height:1.3;cursor:pointer;flex-shrink:0}
html #purple-hands-play .yh-beta-disclosure b{display:grid;place-items:center;width:20px;height:20px;border:1px solid var(--p-line);border-radius:50%;color:var(--p-purple)}
html #purple-hands-play .yh-beta-disclosure:focus-visible{outline:2px solid var(--p-purple);outline-offset:3px}
html #purple-hands-play .p-dialog[data-view=beta-risk] p{font-size:14px;line-height:1.6;color:var(--p-dim)}
html #purple-hands-play .p-dialog[data-view=beta-risk] strong{color:var(--p-purple)}
@media(max-width:520px){html #purple-hands-play .yh-beta-disclosure{font-size:9px;padding:6px;gap:4px;max-width:130px}}
/* Draw attention to the return-to-live action only while exploring history. */
@keyframes yh-return-live-pulse{0%,100%{box-shadow:0 0 0 0 #f0b90b00}50%{box-shadow:0 0 0 6px #f0b90b26,0 0 16px #f0b90b55}}
html #purple-hands-play[data-owned=true] [data-chart-reset][data-following=false]{animation:yh-return-live-pulse 1.5s ease-in-out infinite;border-color:#f0b90b!important;color:#181a20!important;background:#f0b90b!important}
@media(prefers-reduced-motion:reduce){html #purple-hands-play[data-owned=true] [data-chart-reset][data-following=false]{animation:none;box-shadow:0 0 0 2px #f0b90b55}}
html #purple-hands-play[data-owned=true] .yh-chart-fill[data-kind=entry]{color:#52d6ed;border-color:#52d6ed}

#purple-hands-play #yh-paper-settings{display:none}
#purple-hands-play[data-visitor=true][data-phase=ready] #yh-paper-settings{display:block;grid-column:1/-1;justify-self:center;background:transparent;border:0;color:var(--p-purple);font:inherit;font-size:13px;min-height:32px;cursor:pointer}
#purple-hands-play[data-visitor=true] #yh-position-info [data-wallet-detail]{display:none!important}
html #purple-hands-play[data-visitor=true] #p-ready-hero,
html #purple-hands-play[data-visitor=true] :is(#yh-close-estimate,#p-active-controls .yh-notice,#p-active-controls [data-action=recovery],#p-active-controls .p-buffer,.yh-recent-trades,.yh-tx [data-action=retry]){display:none!important}
html #purple-hands-play[data-visitor=true] #p-balance{font-size:clamp(12px,2vh,24px)}
html #purple-hands-play[data-visitor=true] .p-wallet{min-height:44px;min-width:88px}
.yh-practice-login{margin-top:16px;border-top:1px solid var(--p-line);padding-top:8px;text-align:center}.yh-practice-login button{min-height:44px}

html #purple-hands-play[data-owned=true][data-trade-focus=true] :is(.p-header,.p-footer,.yh-workspace-bar,.p-chart-gesture-hint,.p-pool-caption){display:none}
html #purple-hands-play[data-owned=true][data-trade-focus=true] #p-live-hero{display:flex;flex-direction:row;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px 12px;padding:0;margin:0}
html #purple-hands-play[data-owned=true][data-trade-focus=true] #p-live-status{margin:0}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .yh-pnl-unit{font-size:11px;color:var(--p-dim)}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .yh-info-toggle{padding:0;width:36px;height:36px;border:0;border-radius:50%;color:var(--p-ink);background:var(--p-raised);font-size:19px;cursor:pointer}
html #purple-hands-play[data-owned=true][data-trade-focus=true] #p-active-controls{width:100%;max-width:none;display:grid;grid-template-columns:1fr;justify-items:center;padding:3px 0 max(4px,env(safe-area-inset-bottom))}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout{width:clamp(112px,17vw,210px);min-height:44px;height:44px;display:flex;justify-content:center;align-items:center;text-align:center;margin-inline:auto;padding:4px 12px;border-radius:12px}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout-label{font-size:20px}
html #purple-hands-play[data-owned=true][data-trade-focus=true] #yh-position-info{box-sizing:border-box;width:min(370px,calc(100vw - 24px));max-height:70dvh;overflow:auto;margin:auto;padding:18px;background:var(--p-surface);color:var(--p-ink);border:1px solid var(--p-line);border-radius:16px;text-align:left}
html #purple-hands-play[data-owned=true][data-trade-focus=true] #yh-position-info::backdrop{background:#0008}
html #purple-hands-play[data-owned=true][data-trade-focus=true] #yh-position-info>button:first-child{float:right;height:38px;width:38px;color:inherit;background:var(--p-raised);border:0;border-radius:50%;cursor:pointer}
html #purple-hands-play[data-owned=true][data-trade-focus=true] #yh-position-info h3{margin:6px 0 16px}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-live-chart{display:block;position:relative;padding:0}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-live-chart canvas{display:block;width:100%;height:100%}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-pool-chart-top{position:absolute;inset:4px 72px auto 8px;pointer-events:none;z-index:1}
html #purple-hands-play[data-owned=true][data-trade-focus=true] .p-chart-navigation{position:absolute;right:4px;top:0;z-index:2}
`;
