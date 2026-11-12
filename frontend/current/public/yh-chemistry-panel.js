const RELAY='https://yh-chemistry.boogaav.workers.dev',KEY='yellowhands.watch-room';
let loading;
function load(){
  if(customElements.get('yh-chemistry'))return Promise.resolve();
  return loading??=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='/chemistry.js';script.async=true;
    script.onload=()=>customElements.get('yh-chemistry')?resolve():reject(Error('Panel unavailable'));
    script.onerror=()=>reject(Error('Panel unavailable'));document.head.append(script);
  });
}
export function mountChemistryPanel(container,{body=true}={}){
  const panel=document.createElement('aside');panel.className='yh-chemistry-sidebar clarity-mask';panel.setAttribute('data-clarity-mask','true');
  panel.setAttribute('aria-label','Yellow Hands body illustration');
  panel.innerHTML='<div data-body></div><p data-status role="status">Loading body illustration…</p><details><summary>Watch settings</summary><form class="clarity-mask" data-clarity-mask="true"><label>Pulse room key <input type="password" autocomplete="off" spellcheck="false" maxlength="32" aria-label="Secret Pulse room key"></label><button type="submit">Save</button><button type="button" data-clear>Forget</button></form><small>Stored only in this browser. Anyone with this key can view the linked heart rate.</small></details><small>Fills are an illustration, not hormone levels. Only live Watch BPM is measured.</small><a href="/chemistry#science" target="_blank" rel="noopener noreferrer">Science &amp; sources ↗</a>';
  if(body){
    const content=document.createElement('div');content.className='yh-chemistry-content';
    content.append(...panel.childNodes);
    const toggle=document.createElement('button');toggle.type='button';toggle.className='yh-chemistry-toggle';
    let collapsed=false;try{collapsed=localStorage.getItem('yellowhands.chemistry-collapsed')==='1';}catch{}
    const apply=()=>{content.hidden=collapsed;panel.dataset.collapsed=String(collapsed);container.classList.toggle('yh-chemistry-collapsed',collapsed);toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Show body chemistry':'Collapse body chemistry');toggle.title=toggle.getAttribute('aria-label');toggle.textContent=collapsed?'◉':'− Chemistry';};
    toggle.addEventListener('click',()=>{collapsed=!collapsed;apply();try{localStorage.setItem('yellowhands.chemistry-collapsed',collapsed?'1':'0');}catch{}});
    panel.append(toggle,content);apply();
  }
  container.append(panel);
  let element,dead=false,ready=false,trade=null,outcome,ended=false;
  const status=panel.querySelector('[data-status]');
  function room(){try{return localStorage.getItem(KEY)||'';}catch{return '';}}
  function mount(){
    element?.remove();element=document.createElement('yh-chemistry');
    if(body)element.setAttribute('layout','body');
    element.setAttribute('relay',RELAY);
    const key=room();if(/^[a-f0-9]{32}$/i.test(key))element.setAttribute('room',key);
    panel.querySelector('[data-body]').append(element);
    if(trade){element.setTrade(trade);if(ended)element.endTrade(outcome);}
  }
  load().then(()=>{if(dead)return;ready=true;status.hidden=true;mount();}).catch(()=>{if(!dead)status.textContent='Body illustration unavailable. Trading is unaffected.';});
  panel.querySelector('form').addEventListener('submit',e=>{
    e.preventDefault();const input=panel.querySelector('input'),key=input.value.trim();
    if(!/^[a-f0-9]{32}$/i.test(key)){input.setCustomValidity('Use the 32-character hex key from Pulse.');input.reportValidity();return;}
    try{localStorage.setItem(KEY,key.toLowerCase());input.value='';if(ready)mount();status.textContent='Watch key saved on this browser.';}catch{status.textContent='Browser storage unavailable. Key was not saved.';}status.hidden=false;
  });
  panel.querySelector('input').addEventListener('input',e=>e.target.setCustomValidity(''));
  panel.querySelector('[data-clear]').addEventListener('click',()=>{
    try{localStorage.removeItem(KEY);}catch{}panel.querySelector('input').value='';if(ready)mount();status.hidden=false;status.textContent='Watch key forgotten.';
  });
  return {
    start(t){if(dead||trade&&!ended)return;trade=t;ended=false;outcome=undefined;try{element?.setTrade(t);}catch{}},
    end(pnl){if(dead||!trade||ended)return;ended=true;outcome=Number.isFinite(pnl)?pnl:undefined;try{element?.endTrade(outcome);}catch{}},
    reset(){trade=null;ended=false;outcome=undefined;if(ready)mount();},
    destroy(){dead=true;element?.remove();panel.remove();container.classList.remove('yh-chemistry-collapsed');}
  };
}
