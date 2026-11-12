// Anonymous tab sessions only. Account identifiers never enter traffic events.
import {trafficPath} from './routes.mjs';
export function initAnalytics(getWallet=()=>null,{syncWallet=true}={}){
 if(!['purplehands.wtf','yellowhands.wtf'].includes(location.hostname))return;
 if(window.__handsTraffic){window.__handsTraffic.setWallet(getWallet,syncWallet);return window.__handsTraffic;}
 const enabled=()=>{try{return navigator.globalPrivacyControl!==true&&navigator.doNotTrack!=='1'&&localStorage.getItem('hands:analytics-off')!=='1';}catch{return false;}};
 let id;try{id=sessionStorage.getItem('hands:analytics-session');if(!id){id=crypto.randomUUID();sessionStorage.setItem('hands:analytics-session',id);}}catch{return;}
 const send=(path,body)=>{try{return fetch('/api/analytics/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{});}catch{}};
 let referrer='direct';try{const h=new URL(document.referrer).hostname;if(h!==location.hostname)referrer=h;}catch{}
 const event=name=>{const path=trafficPath(location.pathname);if(enabled()&&path)send('event',{id,event:name,path,device:matchMedia('(max-width:700px)').matches?'mobile':'desktop',referrer});};
 let lastPath=null,connected=null;
 const check=()=>{if(document.hidden)return;const path=trafficPath(location.pathname);if(path!==lastPath){lastPath=path;if(path)event('view');}let wallet;try{wallet=getWallet();}catch{}if(wallet&&wallet!==connected)event('connect');connected=wallet||null;};
 check();
 setInterval(()=>{check();event('heartbeat');let wallet;try{wallet=getWallet();}catch{}if(syncWallet&&/^0x[0-9a-f]{40}$/i.test(wallet||''))send('sync',{wallet:wallet.toLowerCase()});},30000);
 // Poll account readiness separately so short visits and wallet switches count.
 setInterval(check,1000);
 addEventListener('popstate',check);document.addEventListener('visibilitychange',check);
 document.addEventListener('click',e=>{const target=e.target.closest?.('[data-enter],[data-action]');if(!target)return;const a=target.dataset.action;if(target.hasAttribute('data-enter')||['long','short','up','down','open-long','open-short'].includes(a))event('trade');if(['deposit','deposit-submit','load','topup'].includes(a))event('deposit');});
 const api={event,check,setWallet(fn,sync){getWallet=fn;syncWallet=sync;check();},deposit:hash=>send('deposit',{hash})};window.__handsTraffic=api;return api;
}
