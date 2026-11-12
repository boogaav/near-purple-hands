// Presentation only. The confirmed position, receipt and existing close handler
// remain authoritative; a submitted entry must never look like an open trade.
export function isTradeFocused({position, result, workspace = 'trader'}) {
  return workspace === 'trader' && !result && position?.filled === true && !position.settled;
}

export function exitPresentation({busy, pending, authorized, canCloseWithSession=authorized, healthy, exitRecovery,closePending,position}, estimate) {
  if(closePending)return {label:'EXIT REQUESTED',detail:'Checking the confirmed position'};
  if (busy) return {label:'EXITING…', detail:'Sending your exit · awaiting confirmation'};
  if (pending && exitRecovery) return {label:'EXIT VIA WALLET', detail:'Confirmation delayed · tap to close directly'};
  if (pending) return {label:'EXITING…', detail:'Checking your request and onchain status'};
  const intent = !estimate ? 'Close position' : estimate.net > 0n ? 'Take profit' : estimate.net < 0n ? 'Take loss' : 'Close at break-even';
  const value = estimate ? ' · $'+(Number(estimate.traderCreditRaw)/1e6).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' est. return' : ' · estimate unavailable';
  return {label:'EXIT', detail:intent+value+(!canCloseWithSession || !healthy ? ' · via wallet' : '')};
}

export const FOCUS_CSS = `
#purple-hands-play[data-owned=true][data-trade-focus=true]{display:flex;flex-direction:column;height:auto;min-height:100svh}
#purple-hands-play[data-owned=true][data-trade-focus=true] :is(.p-header,.p-footer,.yh-workspace-bar,.p-marketbar,.p-sourcebar,.p-chart-foot){opacity:.24;transition:opacity .3s ease}
#purple-hands-play[data-owned=true][data-trade-focus=true] :is(.p-header,.p-footer,.yh-workspace-bar,.p-marketbar,.p-sourcebar,.p-chart-foot):is(:hover,:focus-within){opacity:1}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-header{min-height:56px;padding-block:4px}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-arena{flex:1;gap:6px;padding-top:6px;padding-bottom:12px}
#purple-hands-play[data-owned=true][data-trade-focus=true] .yh-workspace-tabs{padding:3px}
#purple-hands-play[data-owned=true][data-trade-focus=true] .yh-workspace-tabs button{min-height:30px;padding:4px 20px;font-size:11px}
#purple-hands-play[data-owned=true][data-trade-focus=true] #yh-trader-panel{display:flex;flex-direction:column;flex:none;gap:0;height:auto;max-width:1440px;padding-bottom:0}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-terminal{display:flex;flex-direction:column;flex:none;gap:4px;min-height:0;background:transparent;border:0;box-shadow:none;overflow:visible;padding:0 20px}
#purple-hands-play[data-owned=true][data-trade-focus=true] :is(.p-marketbar,.p-sourcebar){display:none}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-control-panel{display:contents}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-hands{display:none}
#purple-hands-play[data-owned=true][data-trade-focus=true] #p-trading{display:flex;flex-direction:column;gap:6px;min-height:0}
#purple-hands-play[data-owned=true][data-trade-focus=true] #p-live-hero{flex:none;padding:0;min-height:0}
#purple-hands-play[data-owned=true][data-trade-focus=true] #p-live-status{display:block;font-size:9px;line-height:12px;margin:0}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-live-value{font-size:clamp(32px,3.5vw,42px);line-height:1.05;letter-spacing:-1.5px;margin:2px 0 4px}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-live-meta{font-size:10px}
#purple-hands-play[data-owned=true][data-trade-focus=true] #p-pnl-reference{font-size:9px;line-height:12px;margin-top:3px}
#purple-hands-play[data-owned=true][data-trade-focus=true] :is(#p-roi,#p-pnl)[data-sign=profit]{color:#25d99c}
#purple-hands-play[data-owned=true][data-trade-focus=true] :is(#p-roi,#p-pnl)[data-sign=loss]{color:var(--p-red)}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-chart-container{flex:none;height:50svh;min-height:240px;width:100%;margin:0 auto}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-live-chart{background:transparent;border-color:transparent}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-chart-foot{display:none}
#purple-hands-play[data-owned=true][data-trade-focus=true] :is(.p-pool-chart-top,.p-pool-caption,.p-chart-gesture-hint){opacity:.45}
#purple-hands-play[data-owned=true][data-trade-focus=true] .yh-tx{justify-content:center;font-size:10px;min-height:20px;flex:none}
#purple-hands-play[data-owned=true][data-trade-focus=true] .yh-tx .yh-link{min-height:24px;padding:3px 0}
#purple-hands-play[data-owned=true][data-trade-focus=true] .yh-tx .yh-link{margin-left:8px}
#purple-hands-play[data-owned=true][data-trade-focus=true] #p-active-controls{width:min(100%,480px);max-width:480px;padding:8px 0 0;margin:0 auto;flex-shrink:0;display:grid;grid-template-columns:1fr;gap:0}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout{grid-row:1;min-height:80px;gap:5px;padding:12px 20px;border:1px solid #6bf4b5;border-radius:20px;background:#23d997;color:#06271b;box-shadow:0 7px 32px #23d9971c;font-weight:750}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout:hover:not(:disabled){background:#48eaaa;box-shadow:0 7px 36px #23d99730}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout:focus-visible{outline:3px solid #fff;outline-offset:5px}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout:disabled{opacity:.7;cursor:wait}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout-label{font-size:32px;line-height:1;letter-spacing:1px}
#purple-hands-play[data-owned=true][data-trade-focus=true] #p-cashout-value{font-size:12px;line-height:1.4;letter-spacing:0;text-align:center}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-buffer-row{margin:12px 0 4px;font-size:10px}
#purple-hands-play[data-owned=true][data-trade-focus=true] .p-buffer{height:2px;margin:0 0 2px}
#purple-hands-play[data-owned=true][data-trade-focus=true] :is(#p-active-note,#yh-close-estimate){font-size:10px;line-height:1.4;text-align:center;margin:6px 0 0}
#purple-hands-play[data-owned=true][data-trade-focus=true] #p-active-controls>.yh-link{justify-self:center;padding:8px;font-size:10px}
#purple-hands-play[data-owned=true][data-trade-focus=true] #p-active-note{opacity:.65}
@media(min-width:900px){
 #purple-hands-play[data-owned=true][data-trade-focus=true] .yh-workspace-bar{max-width:1440px}
}
@media(max-width:899px){
 #purple-hands-play[data-owned=true][data-trade-focus=true] .p-header .p-manifesto{display:none}
 #purple-hands-play[data-owned=true][data-trade-focus=true] .p-arena{padding:6px 14px 14px}
 #purple-hands-play[data-owned=true][data-trade-focus=true] .p-terminal{padding:0}
 #purple-hands-play[data-owned=true][data-trade-focus=true] .p-live-value{font-size:36px}
 #purple-hands-play[data-owned=true][data-trade-focus=true] .p-cashout{min-height:82px}
}
/* Short windows scroll the supporting details instead of crushing the plot. */
@media(max-height:720px){
 #purple-hands-play[data-owned=true][data-trade-focus=true] .p-live-value{font-size:32px}
 #purple-hands-play[data-owned=true][data-trade-focus=true] .p-arena{padding-top:0;gap:0}
 #purple-hands-play[data-owned=true][data-trade-focus=true] .p-terminal{gap:2px}
 #purple-hands-play[data-owned=true][data-trade-focus=true] #p-trading{gap:4px}
}
@media(prefers-reduced-motion:reduce){#purple-hands-play[data-owned=true][data-trade-focus=true] *{transition:none!important}}
`;
