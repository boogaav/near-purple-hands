import {trafficPath} from './routes.mjs';
export const GA_ID='G-FN2P4JQ8EE', CLARITY_ID='z34aao47ul';
export const BRAND_ANALYTICS=Object.freeze({
 'purplehands.wtf':Object.freeze({ga:GA_ID,clarity:CLARITY_ID}),
 'yellowhands.wtf':Object.freeze({ga:'G-3XBESZPB5V',clarity:'z6wiwvaegl'}),
});
const publicProductPage=path=>trafficPath(path)!==null;
const replayPage=path=>['/','/papertrades'].includes(trafficPath(path));
export const EXTERNAL_CONSENT='hands:external-analytics';
export function externalAllowed(location,navigator,storage){
  try{return ['purplehands.wtf','yellowhands.wtf'].includes(location.hostname)&&publicProductPage(location.pathname)&&navigator.globalPrivacyControl!==true&&navigator.doNotTrack!=='1'&&storage.getItem('hands:analytics-off')!=='1'&&storage.getItem(EXTERNAL_CONSENT)==='granted';}catch{return false;}
}
export function createExternalTracker(w,d){
  const ids=BRAND_ANALYTICS[w.location.hostname];
  if(!ids)return {update(){},stopForAccount(){}};
  const {ga:GA_ID,clarity:CLARITY_ID}=ids;
  let loaded=false,replayStopped=false;
  const script=src=>{const el=d.createElement('script');el.async=true;el.src=src;d.head.append(el);};
  const stopForAccount=()=>{if(replayStopped)return;replayStopped=true;w['ga-disable-'+GA_ID]=true;if(w.clarity)w.clarity('stop');};
  function update(){
    const allowed=externalAllowed(w.location,w.navigator,w.localStorage);
    w['ga-disable-'+GA_ID]=!allowed||replayStopped;
    if(!allowed){
      if(w.gtag)w.gtag('consent','update',{analytics_storage:'denied'});
      if(w.clarity){w.clarity('consentv2',{ad_Storage:'denied',analytics_Storage:'denied'});w.clarity('stop');replayStopped=true;}
      return;
    }
    if(replayStopped)return;
    if(loaded){w.gtag('consent','update',{analytics_storage:'granted'});return;}
    loaded=true;
    w.dataLayer=w.dataLayer||[];
    w.gtag=w.gtag||function(){w.dataLayer.push(arguments);};
    w.gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
    w.gtag('js',new Date());
    // Only a canonical page view; no wallet identifiers, query strings or financial events.
    let referrer='';try{referrer=new URL(d.referrer).origin+'/';}catch{}
    w.gtag('config',GA_ID,{page_location:'https://'+w.location.hostname+trafficPath(w.location.pathname),page_referrer:referrer,allow_google_signals:false,allow_ad_personalization_signals:false});
    script('https://www.googletagmanager.com/gtag/js?id='+GA_ID);
    // Replay is limited to the public, disconnected experience. Do not start on
    // URLs that may contain account information or after wallet UI was opened.
    if(!replayStopped&&replayPage(w.location.pathname)&&!w.location.search&&!w.location.hash){
      w.clarity=w.clarity||function(){(w.clarity.q=w.clarity.q||[]).push(arguments);};
      w.clarity('consentv2',{ad_Storage:'denied',analytics_Storage:'granted'});
      script('https://www.clarity.ms/tag/'+CLARITY_ID);
    }
  }
  return {update,stopForAccount};
}
export function initExternalAnalytics(root){
  if(!['purplehands.wtf','yellowhands.wtf'].includes(location.hostname)||!publicProductPage(location.pathname))return;
  const tracker=createExternalTracker(window,document);
  // Mask dynamic account text even while a downloaded replay script is starting.
  root.querySelectorAll('.p-wallet,#p-overlay,#p-toast,#p-live-hero,#p-result,#p-active-controls,#p-announcement').forEach(el=>el.setAttribute('data-clarity-mask','true'));
  const strip=document.createElement('section');strip.className='ph-analytics-choice';strip.setAttribute('aria-label','Optional analytics');
  strip.innerHTML='<p>Help improve Hands?<small>Allow Google Analytics and Clarity cookies for usage insights and public-page replay. <a href="/privacy" target="_blank" rel="noopener">Privacy settings</a></small></p><div><button type="button" data-consent="denied">No thanks</button><button type="button" data-consent="granted">Allow analytics</button></div>';
  const style=document.createElement('style');style.textContent='.ph-analytics-choice{margin:12px 0;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:18px;border:1px solid var(--p-line,#51406a);border-radius:16px;background:var(--p-surface,#251b36);color:var(--p-ink,#faf7ff);font:600 14px/1.5 system-ui}.ph-analytics-choice[hidden]{display:none}.ph-analytics-choice p{margin:0}.ph-analytics-choice small{display:block;font-size:12px;font-weight:400;opacity:.8}.ph-analytics-choice a{color:inherit}.ph-analytics-choice>div{display:flex;gap:8px;flex-shrink:0}.ph-analytics-choice button{font:inherit;font-size:12px;padding:10px 14px;border:1px solid currentColor;border-radius:9px;background:transparent;color:inherit;cursor:pointer}.ph-analytics-choice button[data-consent=granted]{background:var(--p-purple,#bd9bff);color:#191321;border-color:transparent}.ph-analytics-choice button:focus-visible{outline:2px solid currentColor;outline-offset:3px}@media(max-width:700px){.ph-analytics-choice{flex-direction:column;align-items:stretch}.ph-analytics-choice>div>*{flex:1}}';
  root.append(style);const footer=root.querySelector('.p-footer');if(footer)footer.after(strip);else root.append(strip);
  function update(){try{strip.hidden=!!localStorage.getItem(EXTERNAL_CONSENT)||localStorage.getItem('hands:analytics-off')==='1'||navigator.globalPrivacyControl===true||navigator.doNotTrack==='1';tracker.update();}catch{strip.hidden=true;}}
  strip.addEventListener('click',e=>{const choice=e.target.closest('[data-consent]')?.dataset.consent;if(choice){try{localStorage.setItem(EXTERNAL_CONSENT,choice);}catch{}update();}});
  window.addEventListener('hands:privacy-changed',update);
  window.addEventListener('storage',e=>{if([EXTERNAL_CONSENT,'hands:analytics-off',null].includes(e.key))update();});
  update();return tracker;
}
