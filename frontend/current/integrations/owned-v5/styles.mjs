export const CSS=`
#purple-hands-play[data-owned=true] button.yh-brand-home{display:inline-block;border:0;background:none;color:inherit;font-family:inherit;padding:0;text-align:left;cursor:pointer}
#purple-hands-play[data-owned=true] button.yh-brand-home:focus-visible{outline:2px solid var(--p-purple);outline-offset:6px;border-radius:4px}

#purple-hands-play .yh-funding select{width:100%;padding:12px;margin:0 0 14px;border:1px solid var(--p-line);border-radius:10px;background:var(--p-surface);color:var(--p-ink);font:inherit}

#purple-hands-play[data-owned=true] .p-terminal{grid-template-rows:42px 22px auto minmax(0,1fr)}
#purple-hands-play[data-owned=true] :is(#p-trading,#p-result){grid-row:4}
#purple-hands-play[data-owned=true] .yh-tx{grid-row:3;display:flex;align-items:center;gap:7px;min-height:28px;font-size:10px;color:var(--p-dim);line-height:1.45}
#purple-hands-play[data-owned=true] .yh-status-dot{width:6px;height:6px;border-radius:50%;background:var(--p-purple);flex-shrink:0}
#purple-hands-play[data-owned=true] .yh-tx .yh-link{margin-left:auto;white-space:nowrap}
#purple-hands-play[data-owned=true] .yh-link{background:none;border:0;padding:8px 0;color:var(--p-purple);font:inherit;font-size:11px;text-decoration:underline;text-underline-offset:4px;cursor:pointer}
#purple-hands-play[data-owned=true] .yh-setup{border:1px solid color-mix(in srgb,var(--p-purple) 38%,transparent);background:color-mix(in srgb,var(--p-purple) 5%,transparent);border-radius:18px;padding:20px;text-align:left}
#purple-hands-play[data-owned=true] .yh-kicker{font-size:9px;letter-spacing:1.4px;color:var(--p-purple);font-weight:750}
#purple-hands-play[data-owned=true] .yh-setup h2{font-size:25px;line-height:1.08;letter-spacing:-.7px;margin:12px 0}
#purple-hands-play[data-owned=true] .yh-setup p{font-size:12px;line-height:1.65;color:var(--p-dim);margin:0 0 15px}
#purple-hands-play[data-owned=true] .yh-setup .p-primary{width:100%;font-size:11px;min-height:48px;background:var(--p-purple);color:#181a20;border:0;border-radius:10px;font-weight:750;padding:12px}
#purple-hands-play[data-owned=true] .yh-setup .yh-link{display:block;text-align:center;width:100%;margin-top:8px}
#purple-hands-play[data-owned=true] .p-control-heading{display:none}
#purple-hands-play[data-owned=true] .yh-presets{display:flex;border:1px solid var(--p-line);border-radius:12px;margin:0 0 16px;background:var(--p-surface);width:100%;overflow:hidden}
#purple-hands-play[data-owned=true] .yh-presets span{flex:1;padding:13px 8px;display:flex;align-items:center;justify-content:center;gap:7px;font-size:10px;color:var(--p-dim)}
#purple-hands-play[data-owned=true] .yh-presets span+span{border-left:1px solid var(--p-line)}
#purple-hands-play[data-owned=true] .yh-presets b{font-size:17px;color:var(--p-purple)}
#purple-hands-play[data-owned=true] .yh-settings-row{display:flex;align-items:center;gap:8px;width:100%;max-width:540px;margin:0 auto}
#purple-hands-play[data-owned=true] .yh-settings-row .yh-presets{flex:1;min-width:0;margin:0}
#purple-hands-play[data-owned=true] .yh-settings-row .yh-presets span{flex-wrap:wrap;gap:3px 6px;padding-inline:6px}
#purple-hands-play[data-owned=true][data-entry-ready=true] .yh-setup{border:0;background:none;padding:0}
#purple-hands-play[data-owned=true][data-entry-ready=true] .yh-setup .yh-kicker{display:none}
#purple-hands-play[data-owned=true][data-entry-ready=true] .yh-setup h2{margin:0 0 8px}
#purple-hands-play[data-owned=true][data-entry-ready=true] .yh-setup p{margin-bottom:4px}
#purple-hands-play[data-owned=true][data-entry-ready=true] .yh-setup .p-primary{min-height:32px;padding:6px 0;text-align:left;background:none;color:var(--p-dim);font-size:10px}
#purple-hands-play[data-owned=true][data-entry-ready=true] #p-ready-hero{margin-bottom:12px}
/* Twice the original card height and hand size; keep the two directions adjacent. */
html #purple-hands-play[data-owned=true][data-trade-hands=true] .ph-trade-hand{height:416px;gap:14px;padding:24px 8px}
html #purple-hands-play[data-owned=true][data-trade-hands=true] .ph-trade-hand .p-hand-art{width:130px;max-width:calc(100% - 12px);height:184px}
html #purple-hands-play[data-owned=true][data-trade-hands=true] .ph-trade-hand .p-hand-title{font-size:30px}
@media(max-width:899px),(min-width:900px) and (max-height:800px){
 html #purple-hands-play[data-owned=true][data-trade-hands=true] .ph-trade-hand{height:352px;padding:20px 8px;gap:12px}
 html #purple-hands-play[data-owned=true][data-trade-hands=true] .ph-trade-hand .p-hand-art{width:102px;height:144px}
}
@media(min-width:900px) and (max-height:800px){#purple-hands-play[data-owned=true][data-entry-ready=true] .p-hands{padding-top:4px}}
#purple-hands-play[data-owned=true] .yh-notice{font-size:10px;line-height:1.6;color:var(--p-dim)}
#purple-hands-play[data-owned=true] .yh-notice{margin-top:10px}
#purple-hands-play[data-owned=true] .p-hand-button:disabled{opacity:.42;cursor:not-allowed}
#purple-hands-play[data-owned=true] .yh-back{color:var(--p-dim);font-size:11px;text-decoration:none;padding:8px}
#purple-hands-play[data-owned=true] .p-footer{flex-wrap:wrap;height:auto;min-height:40px}
#purple-hands-play[data-owned=true] .yh-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:20px 0}
#purple-hands-play[data-owned=true] .yh-actions button{padding:10px;background:var(--p-raised);border:1px solid var(--p-line);border-radius:8px;font-size:12px;color:var(--p-ink);min-height:44px}
#purple-hands-play[data-owned=true] .yh-history{border-bottom:1px solid var(--p-line);padding:14px 0;font-size:13px;line-height:1.8}
#purple-hands-play[data-owned=true] .yh-history>span{display:block;color:var(--p-dim);font-size:11px}
#purple-hands-play[data-owned=true] .yh-label{display:block;font-size:12px;margin:16px 0 8px}
#purple-hands-play[data-owned=true] #yh-bridge-amount,#purple-hands-play[data-owned=true] #yh-bridge-hash,#purple-hands-play[data-owned=true] #yh-amount{width:100%;box-sizing:border-box;background:var(--p-raised);color:var(--p-ink);border:1px solid var(--p-line);border-radius:10px;padding:12px;font-size:18px;margin-bottom:16px}
#purple-hands-play[data-owned=true] .p-dialog a{color:var(--p-purple)}
#purple-hands-play[data-owned=true] #yh-dialog-error{color:#ff8397;font-size:12px}
#purple-hands-play[data-owned=true] .yh-access-form :is(input:not([type=checkbox]),textarea){box-sizing:border-box;width:100%;background:var(--p-surface);color:var(--p-ink);border:1px solid var(--p-line);border-radius:10px;padding:12px;font:inherit;font-size:14px;resize:vertical}
#purple-hands-play[data-owned=true] .yh-access-form :is(input,textarea):focus-visible{outline:2px solid var(--p-purple);outline-offset:3px}
#purple-hands-play[data-owned=true] .yh-access-form .yh-label span{color:var(--p-dim);font-size:10px;margin-left:5px}
#purple-hands-play[data-owned=true] .yh-access-consent{display:flex;align-items:flex-start;gap:10px;margin:18px 0;font-size:11px;line-height:1.55;color:var(--p-dim)}
#purple-hands-play[data-owned=true] .yh-access-consent input{width:18px;height:18px;flex-shrink:0;accent-color:var(--p-purple)}
#purple-hands-play[data-owned=true] .p-dialog[data-view^=access] .p-detail-row strong{overflow-wrap:anywhere;max-width:68%}
#purple-hands-play[data-owned=true] .p-dialog[data-view^=access] .p-primary{width:100%;min-height:48px;padding:12px;background:var(--p-purple);color:#181a20;font-weight:750;border:0;border-radius:10px;font-size:12px}
#purple-hands-play[data-owned=true] .p-dialog[data-view^=access] .p-primary:disabled{opacity:.55;cursor:wait}
#purple-hands-play[data-owned=true] .p-active-note{overflow-wrap:anywhere}
#purple-hands-play[data-owned=true] #p-pnl-reference{display:block;font-size:11px;color:var(--p-dim);margin-top:8px}
#purple-hands-play[data-owned=true] .p-cashout{display:flex;flex-direction:column;align-items:center;gap:5px}
#purple-hands-play[data-owned=true] #p-cashout-value{font-size:13px}
@media(min-width:900px) and (max-height:800px){#purple-hands-play[data-owned=true] .yh-setup{padding:14px}#purple-hands-play[data-owned=true] .yh-setup h2{font-size:21px;margin:9px 0}#purple-hands-play[data-owned=true] .yh-setup p{font-size:11px;line-height:1.5;margin-bottom:10px}#purple-hands-play[data-owned=true] .yh-setup .p-primary{min-height:42px}#purple-hands-play[data-owned=true] #p-ready-hero{margin-bottom:12px}#purple-hands-play[data-owned=true] .yh-presets{margin-bottom:8px}#purple-hands-play[data-owned=true] .yh-presets span{padding:10px 6px}#purple-hands-play[data-owned=true] .p-hand-button{height:120px}#purple-hands-play[data-owned=true] .yh-notice{margin-top:6px}}
@media(max-width:899px){#purple-hands-play[data-owned=true] .yh-setup{margin:12px 0}#purple-hands-play[data-owned=true] #p-ready-hero{min-height:0;padding:0;width:100%;max-width:540px;margin:auto}#purple-hands-play[data-owned=true] #p-entry-controls{padding-top:18px}#purple-hands-play[data-owned=true] .yh-tx{width:100%}#purple-hands-play[data-owned=true] .p-stage{padding-bottom:20px}#purple-hands-play[data-owned=true] .p-marketbar{display:grid;grid-template-columns:1fr auto;gap:8px}#purple-hands-play[data-owned=true] #p-leverage{display:none}#purple-hands-play[data-owned=true] .p-market-quote{display:flex;flex-direction:column;align-items:flex-end;gap:3px;min-width:0}#purple-hands-play[data-owned=true] #p-quote-status{font-size:9px;white-space:nowrap}}

#purple-hands-play[data-owned=true] .p-dialog[data-view^=funding]{width:520px;padding:26px;max-height:calc(100dvh - 40px)}
#purple-hands-play[data-owned=true] .p-dialog[data-view^=funding] h2{font-size:27px;margin:20px 0}
#purple-hands-play[data-owned=true] .p-dialog[data-view=funding-home] #p-dialog-title{font-size:20px;margin-bottom:22px}
#purple-hands-play[data-owned=true] .yh-funding{font-size:13px;line-height:1.6}
#purple-hands-play[data-owned=true] .yh-funding p{line-height:1.6;font-size:13px}
#purple-hands-play[data-owned=true] .yh-funding button{font:inherit;cursor:pointer;min-height:44px}
#purple-hands-play[data-owned=true] .yh-funding button:disabled{opacity:.45;cursor:not-allowed}
#purple-hands-play[data-owned=true] .yh-funding :is(button,input,summary):focus-visible{outline:2px solid var(--p-purple);outline-offset:3px}
#purple-hands-play[data-owned=true] .yh-fund-eyebrow{font-size:10px;letter-spacing:1.6px;color:var(--p-dim);font-weight:700}
#purple-hands-play[data-owned=true] .yh-fund-total{font-size:clamp(56px,10vw,80px);line-height:1.2;letter-spacing:-2px;font-weight:750;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;margin-top:4px}
#purple-hands-play[data-owned=true] .yh-funding .yh-fund-caption{font-size:12px;margin:6px 0 20px;color:var(--p-dim)}
#purple-hands-play[data-owned=true] .yh-fund-cards{display:grid;gap:10px;margin:22px 0 10px}
#purple-hands-play[data-owned=true] .yh-fund-card{border:1px solid var(--p-line);border-radius:16px;display:grid;grid-template-columns:26px 1fr auto;gap:10px;padding:16px 12px;align-items:center;background:var(--p-raised)}
#purple-hands-play[data-owned=true] .yh-fund-number{display:grid;place-items:center;width:25px;height:25px;border-radius:50%;color:var(--p-purple);border:1px solid color-mix(in srgb,var(--p-purple) 40%,transparent);font-size:12px;font-weight:750;align-self:start}
#purple-hands-play[data-owned=true] .yh-fund-card h3{font-size:16px;margin:0;letter-spacing:-.2px}
#purple-hands-play[data-owned=true] .yh-fund-card p{font-size:12px;margin:3px 0 6px;max-width:225px}
#purple-hands-play[data-owned=true] .yh-fund-card strong{font-size:26px;font-variant-numeric:tabular-nums}
#purple-hands-play[data-owned=true] .yh-fund-card-unit{color:var(--p-dim);font-size:10px}
#purple-hands-play[data-owned=true] .yh-fund-small{padding:9px 12px;border:1px solid var(--p-line);border-radius:10px;background:var(--p-surface);color:var(--p-purple);font-size:11px!important;font-weight:750!important;white-space:nowrap}
#purple-hands-play[data-owned=true] .yh-fund-filled{background:var(--p-purple);color:#181a20;border-color:var(--p-purple)}
#purple-hands-play[data-owned=true] .yh-fund-tools{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding-top:16px;border-top:1px solid var(--p-line);margin-top:20px}
#purple-hands-play[data-owned=true] .yh-fund-tool{background:var(--p-raised);color:var(--p-ink);border:1px solid var(--p-line);border-radius:10px;padding:10px;font-size:12px!important}
#purple-hands-play[data-owned=true] .yh-fund-tool[data-action=withdraw]{color:var(--p-purple)}
#purple-hands-play[data-owned=true] .yh-funding-steps{list-style:none;display:flex;padding:0;margin:0 0 20px;gap:16px;color:var(--p-dim);font-size:12px}
#purple-hands-play[data-owned=true] .yh-funding-steps li{display:flex;align-items:center;gap:7px;flex:1;border-bottom:2px solid var(--p-line);padding-bottom:12px}
#purple-hands-play[data-owned=true] .yh-funding-steps b{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;border:1px solid var(--p-line);flex-shrink:0}
#purple-hands-play[data-owned=true] .yh-funding-steps [aria-current]{color:var(--p-ink);border-color:var(--p-purple)}
#purple-hands-play[data-owned=true] .yh-funding-steps [aria-current] b{background:var(--p-purple);color:#181a20;border-color:var(--p-purple)}
#purple-hands-play[data-owned=true] .yh-fund-network{display:grid;grid-template-columns:1fr 1fr;gap:12px;border:1px solid color-mix(in srgb,var(--p-purple) 35%,transparent);background:color-mix(in srgb,var(--p-purple) 5%,transparent);border-radius:14px;padding:14px 18px;margin-bottom:12px}
#purple-hands-play[data-owned=true] .yh-fund-network span{display:block;font-size:11px;color:var(--p-dim)}
#purple-hands-play[data-owned=true] .yh-fund-network strong{display:block;font-size:22px;color:var(--p-purple)}
#purple-hands-play[data-owned=true] .yh-fund-receive{display:grid;grid-template-columns:144px 1fr;align-items:center;gap:18px;margin:22px 0}
#purple-hands-play[data-owned=true] .yh-fund-receive canvas{display:block;width:100%!important;height:auto!important;aspect-ratio:1/1;border-radius:12px;max-width:100%}
#purple-hands-play[data-owned=true] .yh-fund-receive>div{min-width:0}
#purple-hands-play[data-owned=true] .yh-fund-receive label{font-size:12px}
#purple-hands-play[data-owned=true] #yh-wallet-address{display:block;width:100%;box-sizing:border-box;border:0;background:var(--p-raised);color:var(--p-ink);padding:10px 8px;border-radius:8px;font:11px monospace;margin:6px 0}
#purple-hands-play[data-owned=true] .yh-fund-receive small{display:block;font-size:10px;line-height:1.5;color:var(--p-dim);margin-top:8px}
#purple-hands-play[data-owned=true] .yh-fund-help{border-top:1px solid var(--p-line);padding:12px 0;font-size:12px;color:var(--p-dim)}
#purple-hands-play[data-owned=true] .yh-fund-help summary{cursor:pointer;color:var(--p-ink);min-height:28px}
#purple-hands-play[data-owned=true] .yh-fund-help ol{padding-left:20px}
#purple-hands-play[data-owned=true] .yh-fund-help li{margin-bottom:8px}
#purple-hands-play[data-owned=true] .yh-fund-help code{overflow-wrap:anywhere;font-size:11px}
#purple-hands-play[data-owned=true] .yh-fund-gas{border:1px solid var(--p-line);border-radius:12px;background:var(--p-raised);padding:14px;margin:8px 0 12px}
#purple-hands-play[data-owned=true] .yh-fund-gas p{font-size:12px;margin:5px 0 10px}
#purple-hands-play[data-owned=true] .yh-fund-gas>span{font-size:11px;color:var(--p-purple)}
#purple-hands-play[data-owned=true] .yh-funding .yh-fund-warning{font-size:11px;margin:12px 0}
#purple-hands-play[data-owned=true] .yh-fund-secondary{width:100%;border:1px solid var(--p-line);border-radius:10px;padding:10px;background:var(--p-raised);color:var(--p-ink);font-size:12px!important}
#purple-hands-play[data-owned=true] .yh-fund-arrival,.yh-fund-review{display:flex;justify-content:space-between;gap:10px;padding:16px 0 6px;font-size:13px}
#purple-hands-play[data-owned=true] .yh-fund-arrival strong{font-size:20px}
#purple-hands-play[data-owned=true] .yh-funding .yh-fund-feedback{font-size:12px;color:var(--p-purple);margin:10px 0;min-height:19px}
#purple-hands-play[data-owned=true] .yh-fund-bottom{display:flex;justify-content:space-between;gap:12px;margin-top:6px}
#purple-hands-play[data-owned=true] .yh-fund-bottom .yh-link{font-size:12px}
#purple-hands-play[data-owned=true] .yh-funding .p-primary{border-radius:12px;font-size:14px;font-weight:750;min-height:52px;color:#181a20;margin-top:8px}
#purple-hands-play[data-owned=true] .yh-fund-balances{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:12px;align-items:center;background:var(--p-raised);border:1px solid var(--p-line);border-radius:14px;padding:18px 14px;margin:20px 0}
#purple-hands-play[data-owned=true] .yh-fund-balances span{font-size:11px;color:var(--p-dim)}
#purple-hands-play[data-owned=true] .yh-fund-balances strong{display:block;font-size:34px;font-weight:750;line-height:1.4;overflow-wrap:anywhere}
#purple-hands-play[data-owned=true] .yh-fund-balances small{font-size:9px;color:var(--p-dim)}
#purple-hands-play[data-owned=true] .yh-fund-balances .yh-fund-arrow{font-size:20px;color:var(--p-purple)}
#purple-hands-play[data-owned=true] .yh-fund-input{display:flex;gap:8px;align-items:stretch;margin-bottom:12px}
#purple-hands-play[data-owned=true] .yh-fund-input #yh-amount{margin:0;min-width:0;font-size:26px}
#purple-hands-play[data-owned=true] .yh-fund-progress{border:1px solid var(--p-line);border-radius:10px;padding:12px;color:var(--p-purple)!important}
#purple-hands-play[data-owned=true] .p-dialog[data-view=funding-withdraw] .p-detail-row strong{font-size:36px;line-height:1.2;overflow-wrap:anywhere}
@media(max-width:500px){#purple-hands-play[data-owned=true] .yh-fund-balances strong{font-size:28px}#purple-hands-play[data-owned=true] .p-dialog[data-view^=funding]{padding:20px;max-height:calc(100dvh - 24px)}#purple-hands-play[data-owned=true] .yh-fund-card{grid-template-columns:23px 1fr;gap:8px}#purple-hands-play[data-owned=true] .yh-fund-card>button{grid-column:2;justify-self:start;min-width:100px}#purple-hands-play[data-owned=true] .yh-fund-receive{grid-template-columns:112px 1fr;gap:12px}#purple-hands-play[data-owned=true] .yh-fund-receive canvas{width:112px;height:112px}#purple-hands-play[data-owned=true] .yh-fund-network{padding:12px}#purple-hands-play[data-owned=true] .yh-fund-network strong{font-size:21px}}

#purple-hands-play[data-owned=true] .p-dialog[data-view=access]{max-width:460px}
#purple-hands-play[data-owned=true] .yh-telegram{border:1px solid color-mix(in srgb,var(--p-purple) 35%,transparent);background:color-mix(in srgb,var(--p-purple) 5%,var(--p-raised));border-radius:18px;padding:20px;margin:20px 0 12px}
#purple-hands-play[data-owned=true] .yh-telegram-top{display:flex;align-items:center;gap:10px}
#purple-hands-play[data-owned=true] .yh-telegram-icon{width:32px;height:32px;display:grid;place-items:center;border-radius:50%;background:var(--p-purple);color:#181a20;font-size:23px}
#purple-hands-play[data-owned=true] .yh-telegram .yh-kicker{font-size:9px;letter-spacing:1.5px}
#purple-hands-play[data-owned=true] .yh-telegram h3{font-size:24px;line-height:1.15;letter-spacing:-.7px;margin:16px 0 8px}
#purple-hands-play[data-owned=true] .yh-telegram p{font-size:13px;line-height:1.6;margin:8px 0 16px}
#purple-hands-play[data-owned=true] .yh-telegram-button{display:flex;align-items:center;justify-content:center;width:100%;box-sizing:border-box;min-height:50px;padding:13px 10px;border:0;border-radius:12px;background:var(--p-purple);color:#181a20!important;font-family:inherit;font-size:12px!important;font-weight:800;text-decoration:none!important;cursor:pointer;text-align:center}
#purple-hands-play[data-owned=true] .yh-telegram-button:hover{filter:brightness(1.08);transform:translateY(-1px)}
#purple-hands-play[data-owned=true] .yh-telegram-button:focus-visible{outline:2px solid var(--p-ink);outline-offset:4px}
#purple-hands-play[data-owned=true] .yh-telegram-button:disabled{opacity:.55;cursor:wait;transform:none}
#purple-hands-play[data-owned=true] .yh-telegram .yh-telegram-help{font-size:11px;margin:12px 0 0;color:var(--p-dim)}
#purple-hands-play[data-owned=true] .yh-telegram .yh-telegram-error{color:var(--p-purple);font-size:12px;margin:12px 0 0}
#purple-hands-play[data-owned=true] .yh-check-access{display:block;width:100%;text-align:center;padding:8px}
@media(max-width:500px){#purple-hands-play[data-owned=true] .p-dialog[data-view=access]{padding:22px;max-height:calc(100dvh - 24px)}#purple-hands-play[data-owned=true] .yh-telegram{padding:16px}#purple-hands-play[data-owned=true] .yh-telegram h3{font-size:22px}}
.yh-fund-email{padding:12px 0 18px;overflow-wrap:anywhere}.yh-fund-email span{display:block;font-size:12px;color:var(--p-muted)}.yh-fund-email strong{display:block;font-size:15px;margin-top:3px}

.yh-pay-receive .yh-label{margin:12px 0 8px}.yh-pay-qr{display:flex;justify-content:center;margin:18px 0 8px}.yh-pay-qr canvas{width:160px!important;height:160px!important;border-radius:12px}.yh-pay-network-note{text-align:center;font-size:13px!important;margin:10px 0!important;color:var(--p-text)!important}.yh-pay-address{display:flex;align-items:center;gap:12px;width:100%;padding:12px;border:1px solid var(--p-border,#353a43);border-radius:12px;background:transparent;color:inherit;text-align:left;margin-bottom:16px;cursor:pointer}.yh-pay-address span{font:11px/1.5 monospace;overflow-wrap:anywhere;min-width:0}.yh-pay-address b{font-size:12px;color:var(--p-accent,#f0b90b);white-space:nowrap;margin-left:auto}.yh-pay-installed{border-top:1px solid var(--p-border,#353a43);margin-top:18px;padding-top:14px}.yh-pay-installed summary{cursor:pointer;font-size:13px;color:var(--p-muted,#aeb4bd)}.yh-pay-installed input{width:100%;box-sizing:border-box;background:transparent;color:inherit;border:1px solid var(--p-border,#353a43);border-radius:10px;padding:12px;font:inherit;margin-bottom:12px}.yh-pay-receive .yh-fund-bottom{margin-top:16px}
`;
