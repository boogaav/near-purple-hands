import { currentTheme, normalizeTheme, themeName, themeArtwork } from './brand-theme.mjs';
import { productUrl } from './domain-brand.mjs';
import { yellowLogoData } from './yellow-logo-data.mjs';
// A browser-local receipt card. No wallet address, account balance, or signing data
// enters the card, and nothing is uploaded until the user chooses a destination.
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => '$' + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + money(n);

export function shareModel({market='BTC', side, leverage, margin, pnl, liquidated=false, demo=false, theme='purple',product='owned',percentageOnly=false}) {
  if (!/^[A-Z0-9]{2,10}$/.test(market) || !['up','down','long','short'].includes(side) ||
      !Number.isFinite(margin) || margin <= 0 || !Number.isFinite(pnl) ||
      !Number.isInteger(leverage) || leverage < 1 || leverage > 10000) throw new Error('A settled trade receipt is required to share.');
  const direction = ['up','long'].includes(side) ? 'LONG' : 'SHORT';
  const roi = pnl / margin * 100;
  return Object.freeze({market, direction, leverage, margin, pnl, liquidated, demo, percentageOnly, theme:normalizeTheme(theme),product:product==='papertrades'?'papertrades':'owned',
    pnlLabel:signed(pnl), marginLabel:money(margin),
    roiLabel:(roi > 0 ? '+' : roi < 0 ? '−' : '') + Math.abs(roi).toLocaleString('en-US',{maximumFractionDigits:1}) + '%',
    status:liquidated ? 'LIQUIDATED.' : pnl > 0 ? 'LOCKED IN.' : 'CLOSED.',
    color:pnl > 0 ? '#d5ff70' : pnl < 0 ? '#ff8fb4' : '#faf7ff'});
}

export function receiptShareModel(receipt) {
  if (!receipt || receipt.instrumentId !== 0 || receipt.netPnlRaw === undefined || typeof receipt.isLong !== 'boolean') return null;
  return shareModel({side:receipt.isLong?'long':'short', leverage:receipt.leverage,
    margin:Number(BigInt(receipt.marginRaw))/1e18, pnl:Number(BigInt(receipt.netPnlRaw))/1e18,
    liquidated:receipt.liquidated,product:'papertrades'});
}

export function historyShareModel(trade) {
  if (!trade || !['Closed','Liquidated'].includes(trade.kind)) return null;
  return receiptShareModel({...trade, liquidated:trade.kind==='Liquidated',
    netPnlRaw:(BigInt(trade.adjustedPnlRaw)-BigInt(trade.userPaidFeeRaw)).toString()});
}

// Native vector artwork follows the existing open-palm / candlestick brand mark.
// Keep it self-contained so exported cards need no external fonts or image fetches.
const palm = `<path d="M78 342 17 285c-25-24 7-58 32-37l77 64-10-148-9-104c-3-29 38-34 42-6l14 123h5L162 39c-2-30 42-31 43-1l4 139h6l10-130c2-30 43-26 41 3l-8 127h6l18-93c5-28 46-21 41 8l-23 122c7 13 9 27 9 43v66c0 31-14 51-37 64v49c0 20-12 31-32 31H151c-20 0-32-12-32-31v-49c-23-12-37-26-41-45Z" fill="#8568ff"/>
<g fill="#27134d"><path d="M165 321h8v58h-8zM202 292h8v58h-8zM239 260h8v58h-8zM276 222h8v65h-8z"/><rect x="159" y="331" width="20" height="35" rx="3"/><rect x="196" y="303" width="20" height="36" rx="3"/><rect x="233" y="271" width="20" height="36" rx="3"/><rect x="270" y="233" width="20" height="42" rx="3"/></g>`;
const yellowTile = () => `<defs><clipPath id="yellow-receipt-logo"><rect x="145" y="70" width="470" height="470" rx="108"/></clipPath></defs><image x="145" y="70" width="470" height="470" href="${yellowLogoData}" clip-path="url(#yellow-receipt-logo)"/>`;
function purpleHands(theme=currentTheme()) {
  if(normalizeTheme(theme)==='yellow')return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 610" aria-hidden="true">${yellowTile()}</svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 610" fill="none" aria-hidden="true"><ellipse cx="380" cy="548" rx="250" ry="28" fill="#150b2d" opacity=".45"/><g transform="translate(45 112) rotate(-12 170 230) scale(.82)">${palm}</g><g transform="translate(709 112) rotate(12 -170 230) scale(-.82 .82)">${palm}</g></svg>`;
}
function coin(x,y,r,angle=0) { return `<g transform="translate(${x} ${y}) rotate(${angle})"><ellipse cy="6" rx="${r}" ry="${r*.9}" fill="#9f5b15"/><circle r="${r}" fill="#f5c65b"/><circle r="${r*.76}" fill="none" stroke="#ffedac" stroke-width="3"/><path d="M-7 -11h10c12 0 12 14 0 14H-7m0-18v30m6-31v6m0 13v13" fill="none" stroke="#946020" stroke-width="4" stroke-linecap="round"/></g>`; }
export function handsAndCoins() {
  if(currentTheme()==='yellow')return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 610" aria-hidden="true">${yellowTile()}${coin(275,78,31,-18)}${coin(522,108,35,19)}${coin(640,335,27,18)}${coin(113,379,25,-20)}</svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 610" fill="none" aria-hidden="true"><ellipse cx="380" cy="548" rx="250" ry="28" fill="#150b2d" opacity=".45"/><g transform="translate(45 112) rotate(-12 170 230) scale(.82)">${palm}</g><g transform="translate(709 112) rotate(12 -170 230) scale(-.82 .82)">${palm}</g>${coin(381,182,51,-12)}${coin(275,78,31,-18)}${coin(522,108,35,19)}${coin(640,335,27,18)}${coin(113,379,25,-20)}<g stroke="#e7d5ff" stroke-width="4" stroke-linecap="round"><path d="M407 39v26m-13-13h26M110 168v22m-11-11h22M596 222v20m-10-10h20"/></g></svg>`;
}

export function shareText(model) {
  return `${model.demo?'DEMO · ':''}${model.market} ${model.direction} · ${model.leverage.toLocaleString('en-US')}×\n${model.status} ${model.percentageOnly ? model.roiLabel+' return on margin' : model.pnlLabel+' net P&L ('+model.roiLabel+')'}\nMY HANDS ARE CLEAN. THEY’RE JUST ${normalizeTheme(model.theme).toUpperCase()}.\n${productUrl(model.theme,model.product)}`;
}

export function socialShareData(platform, model, file) {
  if (!['x','instagram'].includes(platform)) throw new Error('Unsupported share destination.');
  // Instagram image targets may reject a combined file/text payload.
  return platform === 'instagram' ? {files:[file]} : {files:[file],title:themeName(model.theme)+' · '+model.market+' '+model.direction,text:shareText(model)};
}
export function socialShareUrl(platform, model) {
  if (platform === 'x') return 'https://x.com/intent/tweet?'+new URLSearchParams({text:shareText(model)});
  if (platform === 'instagram') return 'https://www.instagram.com/';
  throw new Error('Unsupported share destination.');
}

const xIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.8-8.9L1.8 2h6.5l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z"/></svg>';
const instagramIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".9" fill="currentColor" stroke="none"/></svg>';

export function cardSvg(m) {
  const headline=m.percentageOnly?m.roiLabel:m.pnlLabel;
  const pnlSize = Math.min(108, 440 / (Math.max(5,headline.length) * .62));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs><radialGradient id="glow"><stop stop-color="#7650cc" stop-opacity=".52"/><stop offset="1" stop-color="#251345" stop-opacity="0"/></radialGradient><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#28134f"/><stop offset="1" stop-color="#120c22"/></linearGradient></defs>
  <rect width="1080" height="1080" fill="url(#bg)"/><circle cx="840" cy="440" r="530" fill="url(#glow)"/>
  <rect x="24" y="24" width="1032" height="1032" rx="34" fill="none" stroke="#b693ff" stroke-opacity=".2"/>
  <g font-family="Arial, Helvetica, sans-serif"><text x="68" y="98" fill="#f7f0ff" font-size="36" font-weight="800" letter-spacing="-1">${normalizeTheme(m.theme)}<tspan fill="#b99aff">hands</tspan></text>
  <text x="1012" y="93" text-anchor="end" fill="#bd9aff" font-size="16" letter-spacing="2">${m.demo?'DEMO RECEIPT':'TRADE RECEIPT'}</text>
  <path d="M68 132h944" stroke="#b693ff" stroke-opacity=".23"/>
  <text x="68" y="202" fill="#c7b5e5" font-size="23" letter-spacing="2">${esc(m.market)} · ${esc(m.direction)} · ${m.leverage.toLocaleString('en-US')}×</text>
  <text x="68" y="292" fill="#faf7ff" font-size="58" font-weight="800" letter-spacing="-2">${esc(m.status)}</text>
  <text x="68" y="407" fill="${m.color}" font-size="${pnlSize}" font-weight="800" letter-spacing="-4">${esc(headline)}</text>
  <text x="74" y="453" fill="#bcaad5" font-size="18" letter-spacing="2">${m.percentageOnly?'RETURN ON MARGIN':'NET REALIZED P&amp;L · USDC'}</text>
  <svg x="485" y="285" width="555" height="445" viewBox="0 0 760 610">${purpleHands(m.theme).replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg>
${m.percentageOnly?'':`  <text x="72" y="543" fill="${m.color}" font-size="${Math.min(38,420/(m.roiLabel.length*.62))}" font-weight="700">${esc(m.roiLabel)}</text>
  <text x="74" y="575" fill="#bcaad5" font-size="17">RETURN ON MARGIN</text>`}
  <rect x="68" y="698" width="944" height="104" rx="18" fill="#c6a7ff" fill-opacity=".06" stroke="#c6a7ff" stroke-opacity=".19"/>
${m.percentageOnly?'':`  <text x="94" y="738" fill="#bcaad5" font-size="17">MONEY IN</text><text x="94" y="776" fill="#faf7ff" font-size="27" font-weight="700">${esc(m.marginLabel)} USDC</text>`}
  <text x="982" y="739" text-anchor="end" fill="#cbb4ef" font-size="18">${m.liquidated?'LIQUIDATION':'POSITION CLOSED'}</text><text x="982" y="773" text-anchor="end" fill="#bcaad5" font-size="16">${m.demo?'Simulated trade · no real funds':(m.product==='papertrades'?'Papertrade':'Owned exchange')+' · net of trading fees'}</text>
  <text x="68" y="883" fill="#faf7ff" font-size="40" font-weight="800" letter-spacing="-1">MY HANDS ARE CLEAN</text>
  <text x="68" y="933" fill="#bd9aff" font-size="40" font-weight="800" letter-spacing="-1">THEY’RE JUST <tspan font-style="italic">${normalizeTheme(m.theme).toUpperCase()}.</tspan></text>
  <text x="68" y="1004" fill="#faf7ff" font-size="21">${productUrl(m.theme,m.product).replace('https://','')}</text><text x="1012" y="1004" text-anchor="end" fill="#9f8cb7" font-size="15">${m.demo?'DEMO · NOT A LIVE RECEIPT':'ISOLATED PERPETUALS'}</text></g></svg>`;
  return themeArtwork(svg,m.theme);
}

const dialogStyle = `.ph-share-dialog{box-sizing:border-box;width:min(490px,calc(100vw - 24px));max-height:calc(100dvh - 24px);margin:auto;padding:20px;border:1px solid #a980e84d;border-radius:24px;background:#1c1231;color:#faf7ff;box-shadow:0 30px 100px #0009;font:14px/1.4 Arial,sans-serif;overflow:auto;color-scheme:dark}.ph-share-dialog::backdrop{background:#080512bb;backdrop-filter:blur(9px)}.ph-share-dialog *{box-sizing:border-box}.ph-share-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.ph-share-heading h2{font-size:22px;letter-spacing:-.6px;margin:0}.ph-share-dialog button{font:600 13px Arial,sans-serif;color:#faf7ff;border:1px solid #b79ade40;background:#ffffff08;border-radius:12px;min-height:44px;padding:10px 14px;cursor:pointer}.ph-share-dialog button:focus-visible{outline:2px solid #d5ff70;outline-offset:3px}.ph-share-dialog button:disabled{opacity:.45;cursor:wait}.ph-share-dialog .ph-share-primary{background:#bd9aff;color:#211334;border:0;flex:1}.ph-share-close{font-size:21px!important;width:44px}.ph-share-image{display:block;width:100%;height:auto;border-radius:14px}.ph-share-image[hidden]{display:none}.ph-share-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.ph-share-note{font-size:12px;color:#c5b3dd;margin:12px 0 0}.ph-share-status{font-size:12px;color:#e2d1fa;min-height:17px;margin:8px 0 0}.ph-share-art{display:block;width:150px;height:112px}.p-share{display:inline-flex!important;align-items:center;justify-content:center;gap:7px;background:#bd9aff!important;color:#241438!important;border:1px solid #d4b9ff!important;font-weight:700!important;min-height:44px}.p-share svg{width:34px;height:30px;pointer-events:none}.p-history-share{margin-left:8px!important;font-size:12px!important;padding:7px 10px!important;min-height:36px!important}.ph-share-dialog .ph-share-copy{flex:1}.ph-share-dialog .ph-share-download{flex:1}@media(max-height:750px) and (min-width:540px){.ph-share-dialog{width:420px}.ph-share-image{max-height:52dvh;object-fit:contain}}`;

const socialStyle = `.ph-share-social{display:grid;grid-template-columns:1fr 1fr}.ph-share-social button{display:flex;align-items:center;justify-content:center;gap:9px;min-width:0;min-height:48px;font-size:12px}.ph-share-social svg{width:19px;height:19px;flex-shrink:0}.ph-share-dialog .ph-share-instagram{background:linear-gradient(115deg,#6d45b4,#9f337f 62%,#a04e43);border-color:#df9ec255}.ph-share-dialog [hidden]{display:none!important}`;

export function createTradeSharer() {
  let dialog, model, file, previewUrl, generation=0, sharing=false;
  if (!document.getElementById('ph-share-styles')) { const style=document.createElement('style');style.id='ph-share-styles';style.textContent=dialogStyle+socialStyle;document.head.append(style); }
  function clear() { generation++; file=null; model=null; sharing=false; if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null; }
  function close() { if(dialog?.open)dialog.close();clear(); }
  function status(message) { dialog.querySelector('[role=status]').textContent=message; }
  function download() { const a=document.createElement('a');a.href=previewUrl;a.download=file.name;document.body.append(a);a.click();a.remove();status('Image downloaded. Ready to post.'); }
  function canShare(data) { try {return !!navigator.share && !!navigator.canShare?.(data);} catch {return false;} }
  async function open(next, renderCard=cardSvg) {
    if(!next)throw new Error('Wait for the settled receipt before sharing.');
    close();model={...next,theme:currentTheme()};const request=++generation;
    if(!dialog){
      dialog=document.createElement('dialog');dialog.className='ph-share-dialog';dialog.setAttribute('aria-label','Share trade result');document.body.append(dialog);
      dialog.addEventListener('close',()=>{if(!dialog.open)clear();});
      dialog.addEventListener('click',async event=>{
        const action=event.target.closest('button')?.dataset.share;
        if(action==='close'){close();return;}if(!file)return;
        try{
          if(action==='download')download();
          if(action==='copy') { try {await navigator.clipboard.writeText(shareText(model));status('Trade text copied.');} catch {status('Copy is unavailable here. Download the image instead.');} }
          if(action==='copy-image') { try {await navigator.clipboard.write([new ClipboardItem({'image/png':file})]);status('Image copied. Paste it into your post.');} catch {status('Image copy is unavailable here. Use Download PNG instead.');} }
          if(action==='x'||action==='instagram') {
            if(sharing)return;
            const request=generation,data=socialShareData(action,model,file),name=action==='x'?'X':'Instagram';
            if(canShare(data)) {
              sharing=true;status('Choose '+name+' in your share sheet to attach the image.');
              try {await navigator.share(data);if(request===generation)status('Share sheet closed. Finish your post in '+name+'.');}
              catch(error){if(request===generation)status(error.name==='AbortError'?'Sharing cancelled. Your card is ready.':'Could not open sharing. Download the card and attach it in '+name+'.');}
              finally {if(request===generation)sharing=false;}
            } else {
              const url=socialShareUrl(action,model);
              download();window.open(url,'_blank','noopener,noreferrer');
              status(action==='x'?'Card downloaded. Your X draft has the caption ready; attach the PNG or use Copy image and paste it.':'Card downloaded. Create a post in Instagram and select the PNG. Use Copy caption if you want the preset text.');
            }
          }
          if(action==='native') { if(sharing)return;const request=generation;sharing=true;try {await navigator.share({files:[file],title:themeName(model.theme)+' · '+model.market+' '+model.direction,text:shareText(model)});if(request===generation)status('Share sheet closed. Finish your post in the chosen app.');} catch(error) {if(request===generation)status(error.name==='AbortError'?'Sharing cancelled. Your card is ready.':'Sharing is unavailable here. Use Download PNG instead.');} finally {if(request===generation)sharing=false;} }
        }catch{status('Could not prepare the download. Close this card and try again.');}
      });
    }
    dialog.innerHTML='<div class="ph-share-heading"><h2>Your result, in '+normalizeTheme(model.theme)+'.</h2><button class="ph-share-close" data-share="close" aria-label="Close share preview">×</button></div><img class="ph-share-image" alt="Trade card" hidden><div class="ph-share-actions ph-share-social"><button class="ph-share-primary" data-share="x" disabled>'+xIcon+'<span>SHARE ON X</span></button><button class="ph-share-instagram" data-share="instagram" aria-label="Share on Instagram" disabled>'+instagramIcon+'<span>INSTAGRAM</span></button></div><div class="ph-share-actions"><button data-share="native" hidden>MORE APPS ↗</button><button class="ph-share-download" data-share="download" disabled>DOWNLOAD PNG ↓</button><button data-share="copy-image" hidden>COPY IMAGE</button><button class="ph-share-copy" data-share="copy" disabled>COPY CAPTION</button></div><p class="ph-share-note">'+(model.demo?'Demo result · no real funds.':'Net realized P&L from your settled trade receipt.')+'</p><p class="ph-share-note ph-share-help"></p><p class="ph-share-status" role="status" aria-live="polite">Creating your card…</p>';
    dialog.showModal();
    try {
      const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(renderCard(model));await image.decode();
      if(request!==generation||!dialog.open)return;
      const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;canvas.getContext('2d').drawImage(image,0,0);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(request!==generation||!dialog.open)return;if(!blob)throw new Error('Image unavailable');
      file=new File([blob],normalizeTheme(model.theme)+'-hands-'+model.market.toLowerCase()+'-'+model.direction.toLowerCase()+'.png',{type:'image/png'});
      previewUrl=URL.createObjectURL(blob);
      const preview=dialog.querySelector('img');preview.src=canvas.toDataURL('image/png');preview.alt=model.market+' '+model.direction+' '+model.status+' '+(model.percentageOnly?model.roiLabel+' return on margin.':model.pnlLabel+' net P&L.');preview.hidden=false;
      dialog.querySelector('[data-share=download]').disabled=false;dialog.querySelector('[data-share=copy]').disabled=false;
      dialog.querySelector('[data-share=x]').disabled=false;dialog.querySelector('[data-share=instagram]').disabled=false;
      if(canShare({files:[file]}))dialog.querySelector('[data-share=native]').hidden=false;
      if(navigator.clipboard?.write&&typeof ClipboardItem!=='undefined')dialog.querySelector('[data-share=copy-image]').hidden=false;
      dialog.querySelector('.ph-share-help').textContent=canShare({files:[file]})?'Choose X or Instagram in your share sheet. If the app isn’t listed, download the card and attach it to your post.':'X opens with a preset caption. Download or copy the card to attach it. For Instagram, upload the saved card in a new post.';
      status('Ready to share.');
    }catch{if(request===generation)status('Could not create the card. Close this preview and try again.');}
  }
  return {open,close};
}
